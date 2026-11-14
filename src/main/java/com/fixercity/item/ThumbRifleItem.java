package com.fixercity.item;

import com.fixercity.combat.CombatHandler;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;

/**
 * 엄지 제식 소총: 4발, 14 피해, 사거리 64, 3명까지 관통. 흐트러짐 피해 4 추가.
 * 공명(엄지 솔다토): 맞힌 대상에게 흐트러짐 피해 10 추가 + 강한 넉백 (특수탄).
 */
public class ThumbRifleItem extends GunItem {
    public ThumbRifleItem(Properties properties) {
        super(properties, 4, 14.0F, 64.0, 30, 70, 3, 0.4F, "thumb");
    }

    @Override
    protected void onHit(ServerLevel level, Player player, LivingEntity target, boolean resonant) {
        CombatHandler.addStagger(target, resonant ? 10.0F : 4.0F);
        if (resonant) {
            target.knockback(1.0, player.getX() - target.getX(), player.getZ() - target.getZ());
            level.sendParticles(ParticleTypes.EXPLOSION, target.getX(), target.getY() + target.getBbHeight() * 0.5, target.getZ(),
                    1, 0, 0, 0, 0);
        }
    }
}
