package com.fixercity.progress;

import com.fixercity.FixerCity;
import com.fixercity.item.FixerWeaponItem;
import com.fixercity.item.GunItem;
import com.fixercity.registry.ModDataComponents;
import com.fixercity.request.FixerSavedData;
import com.fixercity.request.RequestManager;
import net.minecraft.core.Holder;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.Attribute;
import net.minecraft.world.entity.ai.attributes.AttributeInstance;
import net.minecraft.world.entity.ai.attributes.AttributeModifier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;

/** 신체 개조 적용과 무기 강화 수치. */
public final class Progression {
    public static final int MAX_REFINE = 5;
    /** 강화 단계당 피해 +8%. */
    public static final float REFINE_DAMAGE_PER_LEVEL = 0.08F;
    private static final int[] REFINE_CHANCE = {100, 100, 100, 80, 60};

    private Progression() {}

    public static int level(LivingEntity entity, Augment a) {
        if (!(entity instanceof ServerPlayer sp)) {
            return 0;
        }
        return RequestManager.data(sp.server).profile(sp.getUUID()).augments.getOrDefault(a.id(), 0);
    }

    /** KeyPageHelper.applyAttributes에서 함께 호출된다 (접속·리스폰·장착 시). */
    public static void applyAugments(Player player) {
        set(player, Attributes.ATTACK_DAMAGE, "aug_muscle", level(player, Augment.MUSCLE) * 1.0, AttributeModifier.Operation.ADD_VALUE);
        set(player, Attributes.MAX_HEALTH, "aug_skeleton", level(player, Augment.SKELETON) * 2.0, AttributeModifier.Operation.ADD_VALUE);
        set(player, Attributes.MOVEMENT_SPEED, "aug_neural_move", level(player, Augment.NEURAL) * 0.04, AttributeModifier.Operation.ADD_MULTIPLIED_BASE);
        set(player, Attributes.ATTACK_SPEED, "aug_neural_attack", level(player, Augment.NEURAL) * 0.04, AttributeModifier.Operation.ADD_MULTIPLIED_BASE);
        set(player, Attributes.ARMOR, "aug_dermal", level(player, Augment.DERMAL) * 1.0, AttributeModifier.Operation.ADD_VALUE);
    }

    /** 흐트러짐 저항 보너스 (CombatHandler.staggerMax). */
    public static float staggerBonus(LivingEntity entity) {
        return level(entity, Augment.STABILIZER) * 3.0F;
    }

    private static void set(Player player, Holder<Attribute> attr, String id, double amount, AttributeModifier.Operation op) {
        AttributeInstance inst = player.getAttribute(attr);
        if (inst == null) {
            return;
        }
        ResourceLocation rl = FixerCity.id(id);
        inst.removeModifier(rl);
        if (amount != 0) {
            inst.addTransientModifier(new AttributeModifier(rl, amount, op));
        }
    }

    /** 한 단계 개조. 성공하면 true (등급/돈 부족이면 메시지용 실패 코드). */
    public static String augment(ServerPlayer player, Augment a, float priceMultiplier) {
        FixerSavedData data = RequestManager.data(player.server);
        FixerSavedData.Profile p = data.profile(player.getUUID());
        int cur = p.augments.getOrDefault(a.id(), 0);
        if (cur >= Augment.MAX_LEVEL) {
            return "max";
        }
        if (RequestManager.grade(player.server, player.getUUID()) > Augment.requiredGrade(cur)) {
            return "grade";
        }
        int cost = Math.round(a.cost(cur) * priceMultiplier);
        if (p.ahn < cost) {
            return "ahn";
        }
        p.ahn -= cost;
        p.augments.put(a.id(), cur + 1);
        data.setDirty();
        com.fixercity.keypage.KeyPageHelper.applyAttributes(player);
        return "ok";
    }

    // ---- 무기 강화 ----

    public static boolean refinable(ItemStack stack) {
        return stack.getItem() instanceof FixerWeaponItem || stack.getItem() instanceof GunItem;
    }

    public static int refineLevel(ItemStack stack) {
        return stack.getOrDefault(ModDataComponents.REFINE.get(), 0);
    }

    public static int refineCost(int current) {
        return 150 * (current + 1) * (current + 1);
    }

    public static int refineChance(int current) {
        return REFINE_CHANCE[Math.min(current, MAX_REFINE - 1)];
    }

    /** 손에 든 무기 강화 시도. "ok" / "fail" / "max" / "ahn" / "item". */
    public static String refine(ServerPlayer player, float priceMultiplier) {
        ItemStack stack = player.getMainHandItem();
        if (!refinable(stack)) {
            return "item";
        }
        int cur = refineLevel(stack);
        if (cur >= MAX_REFINE) {
            return "max";
        }
        FixerSavedData data = RequestManager.data(player.server);
        FixerSavedData.Profile p = data.profile(player.getUUID());
        int cost = Math.round(refineCost(cur) * priceMultiplier);
        if (p.ahn < cost) {
            return "ahn";
        }
        p.ahn -= cost;
        data.setDirty();
        if (player.getRandom().nextInt(100) >= refineChance(cur)) {
            return "fail";
        }
        stack.set(ModDataComponents.REFINE.get(), cur + 1);
        return "ok";
    }
}
