package com.fixercity.item;

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

/** 해결사 철퇴. 기술: 내려찍기 (낙하 중이면 최대 2배). 공명(사무소 해결사): 반경 3.5 -> 4.5. */
public class FixerMaceItem extends FixerWeaponItem {
    public FixerMaceItem(Tier tier, Properties properties) {
        super(tier, properties, 160, "office_fixer");
    }

    @Override
    public DamageKind damageKind() {
        return DamageKind.BLUNT;
    }

    @Override
    protected AbilityResult performAbility(ServerLevel level, Player player, ItemStack stack, boolean resonant) {
        double radius = resonant ? 4.5 : 3.5;
        float fallBonus = 1.0F + Math.min(player.fallDistance, 10.0F) * 0.1F;
        float damage = attackDamage(player) * 0.9F * fallBonus;
        player.resetFallDistance();
        for (LivingEntity target : level.getEntitiesOfClass(LivingEntity.class,
                player.getBoundingBox().inflate(radius, 1.5, radius), t -> isValidTarget(player, t))) {
            if (target.distanceToSqr(player) > radius * radius) {
                continue;
            }
            strike(player, target, damage);
            pushAway(player, target, 1.0);
            target.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 60, 1), player);
        }
        level.sendParticles(ParticleTypes.EXPLOSION, player.getX(), player.getY() + 0.2, player.getZ(), 6, radius * 0.4, 0.1, radius * 0.4, 0);
        level.sendParticles(ParticleTypes.CLOUD, player.getX(), player.getY() + 0.1, player.getZ(), 30, radius * 0.5, 0.05, radius * 0.5, 0.05);
        level.playSound(null, player.getX(), player.getY(), player.getZ(), SoundEvents.ANVIL_LAND, SoundSource.PLAYERS, 0.8F, 0.6F);
        return AbilityResult.USED;
    }
}
