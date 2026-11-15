package com.fixercity.registry;

import com.fixercity.FixerCity;
import com.mojang.serialization.Codec;
import net.minecraft.core.component.DataComponentType;
import net.minecraft.core.registries.Registries;
import net.minecraft.network.codec.ByteBufCodecs;
import net.neoforged.neoforge.registries.DeferredHolder;
import net.neoforged.neoforge.registries.DeferredRegister;

public final class ModDataComponents {
    public static final DeferredRegister<DataComponentType<?>> REGISTER =
            DeferredRegister.create(Registries.DATA_COMPONENT_TYPE, FixerCity.MODID);

    /** 리볼버 실린더에 장전된 탄환 수. */
    public static final DeferredHolder<DataComponentType<?>, DataComponentType<Integer>> AMMO =
            REGISTER.register("ammo", () -> DataComponentType.<Integer>builder()
                    .persistent(Codec.INT)
                    .networkSynchronized(ByteBufCodecs.VAR_INT)
                    .build());

    /** 무기 강화 단계 (+1 ~ +5). */
    public static final DeferredHolder<DataComponentType<?>, DataComponentType<Integer>> REFINE =
            REGISTER.register("refine", () -> DataComponentType.<Integer>builder()
                    .persistent(Codec.INT)
                    .networkSynchronized(ByteBufCodecs.VAR_INT)
                    .build());

    /** 도서관 초대장의 층 id. */
    public static final DeferredHolder<DataComponentType<?>, DataComponentType<String>> FLOOR =
            REGISTER.register("floor", () -> DataComponentType.<String>builder()
                    .persistent(Codec.STRING)
                    .networkSynchronized(ByteBufCodecs.STRING_UTF8)
                    .build());

    private ModDataComponents() {}
}
