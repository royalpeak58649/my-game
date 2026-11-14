package com.fixercity.item;

import com.fixercity.keypage.DamageKind;
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
 * 해결사 단검. 패시브: 등 뒤 공격 1.75배 (CombatHandler). 기술: 백스텝 + 신속 II.
 * 공명(사무소 해결사): 신속 III + 1초 투명화.
 */
public class DaggerItem extends FixerWeaponItem {
    public static final float BACKSTAB_MULTIPLIER = 1.75F;

    public DaggerItem(Tier tier, Properties properties) {
        super(tier, properties, 80, "office_fixer");
    }

    @Override
    public DamageKind damageKind() {
        return DamageKind.PIERCE;
    }

    @Override
    protected AbilityResult performAbility(ServerLevel level, Player player, ItemStack stack, boolean resonant) {
        Vec3 dir = flatLook(player);
        if (dir == null) {
            return AbilityResult.FAILED;
        }
        player.setDeltaMovement(-dir.x * 1.3, 0.35, -dir.z * 1.3);
        player.hurtMarked = true;
        player.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED, 40, resonant ? 2 : 1, false, false, true));
        if (resonant) {
            player.addEffect(new MobEffectInstance(MobEffects.INVISIBILITY, 20, 0, false, false, true));
        }
        level.sendParticles(ParticleTypes.POOF, player.getX(), player.getY() + 0.5, player.getZ(), 10, 0.3, 0.3, 0.3, 0.02);
        level.playSound(null, player.getX(), player.getY(), player.getZ(), SoundEvents.PLAYER_ATTACK_NODAMAGE, SoundSource.PLAYERS, 1.0F, 1.4F);
        return AbilityResult.USED;
    }
}
