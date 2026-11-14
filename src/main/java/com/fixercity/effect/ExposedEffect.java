package com.fixercity.effect;

import net.minecraft.world.effect.MobEffect;
import net.minecraft.world.effect.MobEffectCategory;

/** 약점 노출: 받는 피해 +20%, 레벨당 +15% 추가 (CombatHandler에서 처리). */
public class ExposedEffect extends MobEffect {
    public static float multiplier(int amplifier) {
        return 1.2F + 0.15F * amplifier;
    }

    public ExposedEffect() {
        super(MobEffectCategory.HARMFUL, 0x3FA34D);
    }
}
