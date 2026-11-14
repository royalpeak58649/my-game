package com.fixercity.item;

import com.fixercity.combat.CombatHandler;
import com.fixercity.keypage.DamageKind;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Tier;
import net.minecraft.world.phys.Vec3;

/**
 * 녹슨 쇠파이프 (쥐 패거리). 기술: 모래 뿌리기 - 앞쪽 적에게 실명, 구속, 흐트러짐 피해 4.
 * 공명(쥐 패거리): 흐트러짐 피해 8 + 자신에게 신속 II 3초 (도주).
 */
public class RustyPipeItem extends FixerWeaponItem {
    public RustyPipeItem(Tier tier, Properties properties) {
        super(tier, properties, 120, "rat");
    }

    @Override
    public DamageKind damageKind() {
        return DamageKind.BLUNT;
    }

    @Override
    protected AbilityResult performAbility(ServerLevel level, Player player, ItemStack stack, boolean resonant) {
        for (LivingEntity target : targetsInCone(level, player, 4.0, 0.5)) {
            target.addEffect(new MobEffectInstance(MobEffects.BLINDNESS, 60, 0), player);
            target.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 60, 1), player);
            CombatHandler.addStagger(target, resonant ? 8.0F : 4.0F);
        }
        if (resonant) {
            player.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED, 60, 1, false, false, true));
        }
        Vec3 eye = player.getEyePosition();
        Vec3 look = player.getLookAngle();
        for (int i = 1; i <= 4; i++) {
            Vec3 p = eye.add(look.scale(i));
            level.sendParticles(ParticleTypes.WHITE_ASH, p.x, p.y - 0.3, p.z, 15, 0.3 * i, 0.3, 0.3 * i, 0.02);
        }
        level.playSound(null, player.getX(), player.getY(), player.getZ(), SoundEvents.SAND_BREAK, SoundSource.PLAYERS, 1.0F, 1.2F);
        return AbilityResult.USED;
    }
}
