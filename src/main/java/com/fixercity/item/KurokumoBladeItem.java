package com.fixercity.item;

import com.fixercity.registry.ModEffects;
import java.util.List;
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
 * 쿠로쿠모 장도. 기술: 연참 - 앞쪽 적을 순식간에 세 번 벤다. 한 번 벨 때마다 출혈 1중첩.
 * 공명(쿠로쿠모 회): 마지막에 선혈 폭발 - 출혈 중첩 x2 만큼 추가 피해를 주고 출혈을 터뜨린다.
 */
public class KurokumoBladeItem extends FixerWeaponItem {
    public KurokumoBladeItem(Tier tier, Properties properties) {
        super(tier, properties, 160, "kurokumo");
    }

    @Override
    public DamageKind damageKind() {
        return DamageKind.SLASH;
    }

    @Override
    protected AbilityResult performAbility(ServerLevel level, Player player, ItemStack stack, boolean resonant) {
        List<LivingEntity> targets = targetsInCone(level, player, 3.5, 0.4);
        float damage = attackDamage(player) * 0.5F;
        for (int hit = 0; hit < 3; hit++) {
            for (LivingEntity target : targets) {
                if (target.isAlive()) {
                    strike(player, target, damage);
                    addBleed(player, target);
                }
            }
        }
        if (resonant) {
            for (LivingEntity target : targets) {
                MobEffectInstance bleed = target.getEffect(ModEffects.BLEED);
                if (target.isAlive() && bleed != null) {
                    target.removeEffect(ModEffects.BLEED);
                    target.invulnerableTime = 0;
                    target.hurt(player.damageSources().indirectMagic(player, player), (bleed.getAmplifier() + 1) * 2.0F);
                    level.sendParticles(ParticleTypes.DAMAGE_INDICATOR, target.getX(), target.getY() + target.getBbHeight() * 0.6,
                            target.getZ(), 12, 0.3, 0.3, 0.3, 0.2);
                }
            }
        }
        Vec3 eye = player.getEyePosition();
        Vec3 look = player.getLookAngle();
        for (int i = 0; i < 3; i++) {
            Vec3 p = eye.add(look.scale(1.5 + i * 0.6));
            level.sendParticles(ParticleTypes.SWEEP_ATTACK, p.x, p.y - 0.3 + i * 0.2, p.z, 1, 0, 0, 0, 0);
        }
        level.playSound(null, player.getX(), player.getY(), player.getZ(), SoundEvents.PLAYER_ATTACK_SWEEP, SoundSource.PLAYERS, 1.0F, 1.25F);
        return AbilityResult.USED;
    }

    /** 출혈 1중첩 추가 (최대 5중첩). */
    public static void addBleed(Player player, LivingEntity target) {
        MobEffectInstance current = target.getEffect(ModEffects.BLEED);
        int stacks = current == null ? 0 : Math.min(current.getAmplifier() + 1, 4);
        target.addEffect(new MobEffectInstance(ModEffects.BLEED, 100, stacks), player);
    }
}
