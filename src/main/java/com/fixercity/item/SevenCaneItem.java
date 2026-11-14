package com.fixercity.item;

import com.fixercity.registry.ModEffects;
import net.minecraft.world.entity.monster.Enemy;
import net.minecraft.world.entity.projectile.ProjectileUtil;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.EntityHitResult;
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
 * 세븐 지팡이검. 기술: 간파 - 바라보는 대상(24칸)에게 약점 노출 II(받는 피해 +35%)와 발광 10초.
 * 공명(세븐 협회): 바라본 대상은 약점 노출 III, 주변 10칸의 모든 적에게도 약점 노출 I.
 */
public class SevenCaneItem extends FixerWeaponItem {
    private static final double RANGE = 24.0;

    public SevenCaneItem(Tier tier, Properties properties) {
        super(tier, properties, 200, "seven");
    }

    @Override
    public DamageKind damageKind() {
        return DamageKind.PIERCE;
    }

    @Override
    protected AbilityResult performAbility(ServerLevel level, Player player, ItemStack stack, boolean resonant) {
        Vec3 eye = player.getEyePosition();
        Vec3 look = player.getViewVector(1.0F);
        Vec3 end = eye.add(look.scale(RANGE));
        AABB box = player.getBoundingBox().expandTowards(look.scale(RANGE)).inflate(1.0);
        EntityHitResult hit = ProjectileUtil.getEntityHitResult(level, player, eye, end, box,
                e -> e instanceof LivingEntity l && isValidTarget(player, l));
        LivingEntity focus = hit != null && hit.getEntity() instanceof LivingEntity l ? l : null;

        if (resonant) {
            for (LivingEntity target : level.getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(10.0),
                    t -> t instanceof Enemy && isValidTarget(player, t) && t != focus)) {
                mark(level, player, target, 0);
            }
        } else if (focus == null) {
            return AbilityResult.FAILED;
        }
        if (focus != null) {
            mark(level, player, focus, resonant ? 2 : 1);
        }
        level.playSound(null, player.getX(), player.getY(), player.getZ(), SoundEvents.AMETHYST_BLOCK_CHIME, SoundSource.PLAYERS, 1.5F, 0.7F);
        return AbilityResult.USED;
    }

    private static void mark(ServerLevel level, Player player, LivingEntity target, int amplifier) {
        target.addEffect(new MobEffectInstance(ModEffects.EXPOSED, 200, amplifier), player);
        target.addEffect(new MobEffectInstance(MobEffects.GLOWING, 200, 0), player);
        level.sendParticles(ParticleTypes.ENCHANT, target.getX(), target.getY() + target.getBbHeight(), target.getZ(),
                20, 0.3, 0.3, 0.3, 0.5);
    }
}
