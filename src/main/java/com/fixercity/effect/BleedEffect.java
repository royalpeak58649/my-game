package com.fixercity.effect;

import net.minecraft.world.effect.MobEffect;
import net.minecraft.world.effect.MobEffectCategory;
import net.minecraft.world.entity.LivingEntity;

/** 출혈: 1.5초마다 (중첩 수)만큼 피해. 중첩 = 효과 레벨. */
public class BleedEffect extends MobEffect {
    public BleedEffect() {
        super(MobEffectCategory.HARMFUL, 0x8A0B12);
    }

    @Override
    public boolean applyEffectTick(LivingEntity entity, int amplifier) {
        entity.hurt(entity.damageSources().magic(), amplifier + 1);
        return true;
    }

    @Override
    public boolean shouldApplyEffectTickThisTick(int duration, int amplifier) {
        return duration % 30 == 0;
    }
}
