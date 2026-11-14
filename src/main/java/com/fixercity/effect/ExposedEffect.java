package com.fixercity.effect;

import net.minecraft.world.effect.MobEffect;
import net.minecraft.world.effect.MobEffectCategory;

/** 약점 노출: 받는 피해 +20% (CombatHandler에서 처리). */
public class ExposedEffect extends MobEffect {
    public static final float DAMAGE_MULTIPLIER = 1.2F;

    public ExposedEffect() {
        super(MobEffectCategory.HARMFUL, 0x3FA34D);
    }
}
