package com.fixercity.item;

import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Tier;
import net.minecraft.world.phys.Vec3;

/**
 * 해결사 단검. 패시브: 등 뒤에서 찌르면 피해 1.75배 (FixerEvents에서 처리).
 * 기술: 백스텝 - 뒤로 뛰어 거리를 벌리고 2초간 신속 II.
 */
public class DaggerItem extends FixerWeaponItem implements HasDamageKind {
    @Override
    public com.fixercity.keypage.DamageKind damageKind() {
        return com.fixercity.keypage.DamageKind.PIERCE;
    }

    public static final float BACKSTAB_MULTIPLIER = 1.75F;

    public DaggerItem(Tier tier, Properties properties) {
        super(tier, properties, 80);
    }

    @Override
    protected boolean performAbility(ServerLevel level, Player player, ItemStack stack) {
        Vec3 dir = flatLook(player);
        if (dir == null) {
            return false;
        }
        player.setDeltaMovement(-dir.x * 1.3, 0.35, -dir.z * 1.3);
        player.hurtMarked = true;
        player.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED, 40, 1, false, false, true));

        level.sendParticles(ParticleTypes.POOF, player.getX(), player.getY() + 0.5, player.getZ(), 10, 0.3, 0.3, 0.3, 0.02);
        level.playSound(null, player.getX(), player.getY(), player.getZ(),
                SoundEvents.PLAYER_ATTACK_NODAMAGE, SoundSource.PLAYERS, 1.0F, 1.4F);
        return true;
    }
}
