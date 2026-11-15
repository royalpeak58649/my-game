package com.fixercity.item;

import com.fixercity.combat.CombatHandler;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;

/**
 * 마침표 사무소 저격총: 2발, 22 피해, 사거리 96. 느리지만 한 발이 크다.
 * 공명(마침표 사무소): 흐트러짐 피해 15 + 구속 II 3초.
 */
public class FullStopRifleItem extends GunItem {
    public FullStopRifleItem(Properties properties) {
        super(properties, 2, 22.0F, 96.0, 40, 90, 1, 0.3F, "full_stop");
    }

    @Override
    protected void onHit(ServerLevel level, Player player, LivingEntity target, boolean resonant) {
        if (resonant) {
            CombatHandler.addStagger(target, 15.0F);
            target.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 60, 1), player);
        }
    }
}
