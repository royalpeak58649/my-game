package com.fixercity.reception;

import java.util.Map;
import net.minecraft.nbt.ByteTag;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.Tag;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.world.entity.LivingEntity;

/**
 * 던전에서 잠들어 있다가 깨어나는 손님(예: 기계 전령)을 무대에 들이자마자 깨운다.
 * 보스 모드 내부 코드에 의존하지 않고, 저장 데이터(NBT)의 상태 값만 바꿔서 다시 불러온다.
 * 값 이름은 CI 점검 로그(fixercity smoke: guest ... nbt)에서 확인한 것이다.
 */
public final class GuestAwakening {
    /** 엔티티 id -> (NBT 키 -> 넣을 값). */
    private static final Map<String, Map<String, Tag>> OVERRIDES = Map.of(
            "kobolediator", Map.of("Awaken", flag(true)),
            "wadjet", Map.of("Awaken", flag(true)),
            "ender_golem", Map.of("is_Awaken", flag(true)),
            "netherite_monstrosity", Map.of("is_Awaken", flag(true)),
            "scylla", Map.of("Act", flag(true)));

    private GuestAwakening() {}

    private static Map<String, Tag> overridesFor(LivingEntity boss) {
        ResourceLocation id = BuiltInRegistries.ENTITY_TYPE.getKey(boss.getType());
        return OVERRIDES.getOrDefault(id.getPath(), Map.of());
    }

    /** 소환 직후 (월드에 넣기 전). */
    public static void awaken(LivingEntity boss) {
        Map<String, Tag> o = overridesFor(boss);
        if (o.isEmpty()) {
            return;
        }
        CompoundTag tag = new CompoundTag();
        boss.saveWithoutId(tag);
        o.forEach((k, v) -> tag.put(k, v.copy()));
        boss.load(tag);
    }

    /** CI 점검: 깨우는 값이 실제로 들어갔는지. */
    public static boolean isAwake(LivingEntity boss) {
        Map<String, Tag> o = overridesFor(boss);
        if (o.isEmpty()) {
            return true;
        }
        CompoundTag tag = new CompoundTag();
        boss.saveWithoutId(tag);
        for (Map.Entry<String, Tag> e : o.entrySet()) {
            if (!e.getValue().equals(tag.get(e.getKey()))) {
                return false;
            }
        }
        return true;
    }

    static Tag flag(boolean value) {
        return ByteTag.valueOf(value);
    }
}
