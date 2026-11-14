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
 * 리우 권갑. 기술: 화염 연권 - 앞쪽 4.5칸 부채꼴에 불꽃 주먹. 피해 + 5초 점화 + 넉백.
 * 공명(리우 협회): 사거리 6칸, 피해 +30%, 8초 점화, 자신에게 화염 저항 6초.
 */
public class LiuGauntletItem extends FixerWeaponItem {
    public LiuGauntletItem(Tier tier, Properties properties) {
        super(tier, properties, 120, "liu");
    }

    @Override
    public DamageKind damageKind() {
        return DamageKind.BLUNT;
    }

    @Override
    protected AbilityResult performAbility(ServerLevel level, Player player, ItemStack stack, boolean resonant) {
        double range = resonant ? 6.0 : 4.5;
        float damage = attackDamage(player) * (resonant ? 1.3F : 1.0F);
        for (LivingEntity target : targetsInCone(level, player, range, 0.6)) {
            strike(player, target, damage);
            target.igniteForSeconds(resonant ? 8.0F : 5.0F);
            pushAway(player, target, 0.6);
        }
        if (resonant) {
            player.addEffect(new MobEffectInstance(MobEffects.FIRE_RESISTANCE, 120, 0, false, false, true));
        }
        Vec3 eye = player.getEyePosition();
        Vec3 look = player.getLookAngle();
        for (double d = 0.8; d <= range; d += 0.5) {
            Vec3 p = eye.add(look.scale(d));
            level.sendParticles(ParticleTypes.FLAME, p.x, p.y - 0.2, p.z, 6, 0.15 * d, 0.15 * d, 0.15 * d, 0.02);
        }
        level.playSound(null, player.getX(), player.getY(), player.getZ(), SoundEvents.BLAZE_SHOOT, SoundSource.PLAYERS, 1.0F, 0.9F);
        return AbilityResult.USED;
    }
}
