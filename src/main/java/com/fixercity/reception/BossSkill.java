package com.fixercity.reception;

import com.fixercity.combat.CombatData;
import com.fixercity.combat.CombatHandler;
import com.fixercity.registry.ModEffects;
import java.util.List;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;

/**
 * 사서(보스) 기술. 쓰기 전에 준비 동작(windup)이 있어 보고 피할 수 있다.
 * range: 대상이 이 거리 안에 있어야 고른다.
 */
public enum BossSkill {
    DASH(12, 140), SLAM(5, 160), WHIRLWIND(4, 120), VOLLEY(24, 140), FLAME_CONE(7, 140), PULL(16, 180),
    STARE(14, 200), GUARD(10, 260), HEAL(32, 300), SUMMON(32, 400), BLEED_FLURRY(4, 140), TIME_SLOW(16, 360);

    public static final int WINDUP = 20;
    private final double range;
    private final int cooldown;

    BossSkill(double range, int cooldown) {
        this.range = range;
        this.cooldown = cooldown;
    }

    public double range() {
        return range;
    }

    public int cooldown() {
        return cooldown;
    }

    public String key() {
        return "boss_skill.fixercity." + name().toLowerCase();
    }

    /** 준비 동작 연출. */
    public void telegraph(ServerLevel level, Mob boss) {
        boss.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, WINDUP, 3, false, false));
        level.sendParticles(this == HEAL || this == GUARD ? ParticleTypes.HAPPY_VILLAGER : ParticleTypes.ANGRY_VILLAGER,
                boss.getX(), boss.getY() + boss.getBbHeight() + 0.5, boss.getZ(), 6, 0.4, 0.2, 0.4, 0);
        level.sendParticles(ParticleTypes.ELECTRIC_SPARK, boss.getX(), boss.getY() + 1, boss.getZ(), 20, 0.6, 0.8, 0.6, 0.05);
        level.playSound(null, boss.getX(), boss.getY(), boss.getZ(), SoundEvents.EVOKER_PREPARE_ATTACK, SoundSource.HOSTILE, 1.0F, 0.8F);
    }

    private static List<Player> playersNear(ServerLevel level, Mob boss, double r, Reception rec) {
        return level.getEntitiesOfClass(Player.class, new AABB(boss.blockPosition()).inflate(r),
                p -> rec.isParticipant(p) && p.isAlive() && !p.isSpectator() && !p.isCreative() && p.distanceToSqr(boss) <= r * r);
    }

    private static void hit(Mob boss, LivingEntity target, float damage) {
        target.invulnerableTime = 0;
        target.hurt(boss.damageSources().mobAttack(boss), damage);
    }

    private static Vec3 flatDir(Mob boss, LivingEntity target) {
        Vec3 d = new Vec3(target.getX() - boss.getX(), 0, target.getZ() - boss.getZ());
        return d.lengthSqr() < 1.0E-4 ? new Vec3(0, 0, 1) : d.normalize();
    }

    private static boolean inCone(Mob boss, Vec3 dir, LivingEntity p, double minDot) {
        Vec3 to = new Vec3(p.getX() - boss.getX(), 0, p.getZ() - boss.getZ());
        return to.lengthSqr() < 1 || to.normalize().dot(dir) >= minDot;
    }

    public void perform(ServerLevel level, Mob boss, LivingEntity target, float atk, Reception rec) {
        double x = boss.getX(), y = boss.getY(), z = boss.getZ();
        switch (this) {
            case DASH -> {
                Vec3 dir = flatDir(boss, target);
                Vec3 start = boss.position().add(0, 1, 0);
                Vec3 end = start.add(dir.scale(7));
                boss.setDeltaMovement(dir.x * 2.0, 0.2, dir.z * 2.0);
                boss.hurtMarked = true;
                for (Player p : playersNear(level, boss, 9, rec)) {
                    Vec3 c = p.position().add(0, 1, 0);
                    Vec3 ab = end.subtract(start);
                    double t = Math.max(0, Math.min(1, c.subtract(start).dot(ab) / ab.lengthSqr()));
                    if (c.distanceTo(start.add(ab.scale(t))) <= 1.8) {
                        hit(boss, p, atk * 1.5F);
                    }
                }
                for (int i = 1; i <= 6; i++) {
                    Vec3 p = start.add(dir.scale(i));
                    level.sendParticles(ParticleTypes.SWEEP_ATTACK, p.x, p.y, p.z, 1, 0, 0, 0, 0);
                }
                level.playSound(null, x, y, z, SoundEvents.PLAYER_ATTACK_SWEEP, SoundSource.HOSTILE, 1.2F, 0.6F);
            }
            case SLAM -> {
                for (Player p : playersNear(level, boss, 4.5, rec)) {
                    hit(boss, p, atk * 1.6F);
                    p.knockback(1.2, x - p.getX(), z - p.getZ());
                    p.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 40, 1));
                }
                level.sendParticles(ParticleTypes.EXPLOSION, x, y + 0.2, z, 8, 1.8, 0.1, 1.8, 0);
                level.playSound(null, x, y, z, SoundEvents.ANVIL_LAND, SoundSource.HOSTILE, 1.0F, 0.5F);
            }
            case WHIRLWIND -> {
                for (Player p : playersNear(level, boss, 3.8, rec)) {
                    hit(boss, p, atk * 1.3F);
                    p.knockback(0.8, x - p.getX(), z - p.getZ());
                }
                for (int i = 0; i < 8; i++) {
                    double a = Math.PI * 2 * i / 8;
                    level.sendParticles(ParticleTypes.SWEEP_ATTACK, x + Math.cos(a) * 2, y + 1, z + Math.sin(a) * 2, 1, 0, 0, 0, 0);
                }
                level.playSound(null, x, y, z, SoundEvents.PLAYER_ATTACK_SWEEP, SoundSource.HOSTILE, 1.2F, 0.5F);
            }
            case VOLLEY -> {
                Vec3 eye = boss.getEyePosition();
                for (int shot = 0; shot < 3; shot++) {
                    Vec3 aim = target.getEyePosition().add((level.random.nextDouble() - 0.5) * 1.2, (level.random.nextDouble() - 0.5),
                            (level.random.nextDouble() - 0.5) * 1.2);
                    Vec3 dir = aim.subtract(eye).normalize();
                    Vec3 end = eye.add(dir.scale(range));
                    for (Player p : playersNear(level, boss, range, rec)) {
                        if (p.getBoundingBox().inflate(0.2).clip(eye, end).isPresent()) {
                            hit(boss, p, atk * 0.9F);
                            break;
                        }
                    }
                    for (int i = 2; i < 40; i += 2) {
                        Vec3 pt = eye.add(dir.scale(i * 0.5));
                        level.sendParticles(ParticleTypes.SMOKE, pt.x, pt.y, pt.z, 1, 0, 0, 0, 0);
                    }
                }
                level.playSound(null, x, y, z, SoundEvents.FIREWORK_ROCKET_BLAST, SoundSource.HOSTILE, 1.5F, 0.5F);
            }
            case FLAME_CONE -> {
                Vec3 dir = flatDir(boss, target);
                for (Player p : playersNear(level, boss, 7, rec)) {
                    if (inCone(boss, dir, p, 0.6)) {
                        hit(boss, p, atk);
                        p.igniteForSeconds(5.0F);
                    }
                }
                for (double d = 1; d <= 7; d += 0.5) {
                    level.sendParticles(ParticleTypes.FLAME, x + dir.x * d, y + 1.2, z + dir.z * d, 5, 0.2 * d, 0.3, 0.2 * d, 0.02);
                }
                level.playSound(null, x, y, z, SoundEvents.BLAZE_SHOOT, SoundSource.HOSTILE, 1.2F, 0.7F);
            }
            case PULL -> {
                Vec3 pull = boss.position().subtract(target.position()).normalize().scale(1.5);
                target.setDeltaMovement(pull.x, 0.4, pull.z);
                target.hurtMarked = true;
                hit(boss, target, atk * 0.5F);
                CombatHandler.addStagger(target, 8.0F);
                level.playSound(null, x, y, z, SoundEvents.FISHING_BOBBER_RETRIEVE, SoundSource.HOSTILE, 1.2F, 0.5F);
            }
            case STARE -> {
                Vec3 dir = flatDir(boss, target);
                for (Player p : playersNear(level, boss, 14, rec)) {
                    if (inCone(boss, dir, p, 0.75)) {
                        p.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 60, 1));
                        p.addEffect(new MobEffectInstance(MobEffects.WEAKNESS, 60, 0));
                        CombatHandler.addStagger(p, 5.0F);
                    }
                }
                level.playSound(null, x, y, z, SoundEvents.ELDER_GUARDIAN_CURSE, SoundSource.HOSTILE, 0.5F, 1.4F);
            }
            case GUARD -> {
                CombatData data = CombatHandler.dataFor(boss);
                data.guardUntil = level.getGameTime() + 60;
                data.guardEmpowered = false;
                level.playSound(null, x, y, z, SoundEvents.SHIELD_BLOCK, SoundSource.HOSTILE, 1.0F, 0.7F);
            }
            case HEAL -> {
                for (Mob ally : rec.livingEnemies(level)) {
                    ally.heal(ally.getMaxHealth() * 0.12F);
                    level.sendParticles(ParticleTypes.HEART, ally.getX(), ally.getY() + ally.getBbHeight() + 0.3, ally.getZ(), 3, 0.3, 0.2, 0.3, 0);
                }
                level.playSound(null, x, y, z, SoundEvents.BEACON_POWER_SELECT, SoundSource.HOSTILE, 1.0F, 1.3F);
            }
            case SUMMON -> {
                if (rec.livingEnemies(level).size() < 6) {
                    for (int i = 0; i < 2; i++) {
                        ReceptionManager.spawnAssistant(level, rec, boss.getX() + (i == 0 ? 2 : -2), boss.getZ());
                    }
                }
                level.playSound(null, x, y, z, SoundEvents.EVOKER_PREPARE_SUMMON, SoundSource.HOSTILE, 1.0F, 1.0F);
            }
            case BLEED_FLURRY -> {
                Vec3 dir = flatDir(boss, target);
                for (Player p : playersNear(level, boss, 4, rec)) {
                    if (inCone(boss, dir, p, 0.3)) {
                        for (int i = 0; i < 3; i++) {
                            hit(boss, p, atk * 0.5F);
                        }
                        MobEffectInstance cur = p.getEffect(ModEffects.BLEED);
                        int stacks = cur == null ? 1 : Math.min(cur.getAmplifier() + 2, 4);
                        p.addEffect(new MobEffectInstance(ModEffects.BLEED, 100, stacks));
                    }
                }
                level.playSound(null, x, y, z, SoundEvents.PLAYER_ATTACK_SWEEP, SoundSource.HOSTILE, 1.2F, 1.3F);
            }
            case TIME_SLOW -> {
                for (Player p : playersNear(level, boss, 16, rec)) {
                    p.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 80, 2));
                    p.addEffect(new MobEffectInstance(MobEffects.DIG_SLOWDOWN, 80, 1));
                }
                level.sendParticles(ParticleTypes.REVERSE_PORTAL, x, y + 1, z, 80, 6, 1, 6, 0.05);
                level.playSound(null, x, y, z, SoundEvents.BELL_RESONATE, SoundSource.HOSTILE, 1.5F, 0.6F);
            }
        }
    }
}
