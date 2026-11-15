package com.fixercity.item;

import com.fixercity.combat.CombatData;
import com.fixercity.combat.CombatHandler;
import com.fixercity.keypage.DamageKind;
import java.util.List;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.entity.projectile.ProjectileUtil;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Tier;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.EntityHitResult;
import net.minecraft.world.phys.Vec3;

/**
 * 데이터로 정의하는 조직 무기: 피해 유형 + 기술 종류만 바꿔서 여러 무기를 만든다.
 * 기술 설명/공명 효과는 lang 파일의 ".ability" / ".resonance".
 */
public class SkillWeaponItem extends FixerWeaponItem {
    public enum Skill {
        /** 위협 베기: 앞쪽 부채꼴 피해 + 나약함. 공명: 피해 +20%, 구속 추가. */
        MENACE,
        /** 갈고리 던지기: 12칸 안의 대상을 끌어당기고 흐트러짐 6. 공명: 흐트러짐 12, 구속 II. */
        HOOK_PULL,
        /** 결속의 일격: 앞쪽 피해 + 8칸 안의 아군에게 신속·힘. 공명: 지속 10초 + 재생. */
        RALLY,
        /** 분쇄: 앞의 대상 하나에 강타 + 큰 흐트러짐 피해, 흐트러진 대상이면 2배. 공명: 흐트러짐 1.5배. */
        CRUSH,
        /** 새벽빛: 나와 6칸 안 아군 회복 + 해로운 효과 제거, 주변 적 점화. 공명: 회복량 증가 + 재생 II. */
        DAWNLIGHT,
        /** 응시: 10칸 시야 안의 적에게 구속 III·나약함·발광. 공명: 흐트러짐 피해 8. */
        STARE,
        /** 쐐기 찌르기: 앞으로 6칸 찌르며 관통, 흐트러짐 6. 공명: 흐트러짐 12, 피해 +20%. */
        THRUST,
        /** 회전 베기: 주변 360도 피해 + 넉백. 공명: 반경·피해 증가. */
        WHIRLWIND,
        /** 받아치기: 1.5초 동안 근접 공격을 막고 공격력 x2로 반격. 공명: 2.5초, x2.5. */
        RIPOSTE,
        /** 충전 방출: 충전을 모두 써서 주변에 전격 (충전당 피해 +15%), 흐트러짐 8. 공명: 흐트러짐 15, 충전 절반 유지. */
        CHARGE_BURST,
        /** 공간 절단: 바라보는 대상 뒤로 순간이동해 1.5배로 벤다, 흐트러짐 8. 공명: 흐트러짐 14 + 신속 II. */
        WARP_STRIKE,
        /** 포식: 앞의 대상을 물어뜯어 1.6배 피해, 피해 절반만큼 회복. 공명: 주변 적에게 공포 (나약함·구속). */
        DEVOUR_BITE,
        /** 지령 집행: 6칸 돌진하며 베고 약점 노출 II. 공명: 약점 노출 III + 흐트러짐 10. */
        PROSELYTE_CUT,
        /** 울음의 불길: 앞쪽 8칸에 불길, 8초 점화, 흐트러짐 6. 공명: 자신에게 저항 II + 화염 저항. */
        CRYING_FLAME,
        // ---- 도시의 별 · 하나 협회 ----
        CANE_DISCHARGE,
        PROXY_UNLOCK,
        WILDFIRE_SLASH,
        RABBIT_VOLLEY,
        RHINO_RUSH,
        ANTLER_PULSE,
        GREATER_SPLIT,
        STANCE_SHIFT,
        MESSENGER_DECREE,
        CHINK_THRUST,
        SMOKE_BURST,
        TRIGRAM_CUT
    }

    private final DamageKind kind;
    private final Skill skill;

    public SkillWeaponItem(Tier tier, Properties properties, int cooldown, String resonancePage, DamageKind kind, Skill skill) {
        super(tier, properties, cooldown, resonancePage);
        this.kind = kind;
        this.skill = skill;
    }

    @Override
    public DamageKind damageKind() {
        return kind;
    }

    @Override
    protected AbilityResult performAbility(ServerLevel level, Player player, ItemStack stack, boolean resonant) {
        float atk = attackDamage(player);
        Vec3 eye = player.getEyePosition();
        Vec3 look = player.getLookAngle();
        double x = player.getX(), y = player.getY(), z = player.getZ();
        switch (skill) {
            case MENACE -> {
                for (LivingEntity t : targetsInCone(level, player, 4.0, 0.5)) {
                    strike(player, t, atk * 0.8F * (resonant ? 1.2F : 1.0F));
                    t.addEffect(new MobEffectInstance(MobEffects.WEAKNESS, 100, 0), player);
                    if (resonant) {
                        t.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 60, 1), player);
                    }
                }
                sweep(level, eye, look, 3);
                level.playSound(null, x, y, z, SoundEvents.RAVAGER_ROAR, SoundSource.PLAYERS, 0.5F, 1.6F);
            }
            case HOOK_PULL -> {
                LivingEntity t = lookTarget(level, player, 12.0);
                if (t == null) {
                    return AbilityResult.FAILED;
                }
                Vec3 pull = player.position().subtract(t.position()).normalize().scale(1.4);
                t.setDeltaMovement(pull.x, 0.35, pull.z);
                t.hurtMarked = true;
                strike(player, t, atk * 0.6F);
                CombatHandler.addStagger(t, resonant ? 12.0F : 6.0F);
                if (resonant) {
                    t.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 60, 1), player);
                }
                trail(level, eye, t.getEyePosition(), ParticleTypes.CRIT);
                level.playSound(null, x, y, z, SoundEvents.FISHING_BOBBER_RETRIEVE, SoundSource.PLAYERS, 1.0F, 0.6F);
            }
            case RALLY -> {
                for (LivingEntity t : targetsInCone(level, player, 3.5, 0.5)) {
                    strike(player, t, atk);
                }
                int dur = resonant ? 200 : 120;
                for (Player ally : level.getEntitiesOfClass(Player.class, player.getBoundingBox().inflate(8.0),
                        p -> p.isAlive() && !p.isSpectator())) {
                    ally.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED, dur, 0));
                    ally.addEffect(new MobEffectInstance(MobEffects.DAMAGE_BOOST, dur, 0));
                    if (resonant) {
                        ally.addEffect(new MobEffectInstance(MobEffects.REGENERATION, 100, 0));
                    }
                }
                level.sendParticles(ParticleTypes.END_ROD, x, y + 1.5, z, 30, 2.0, 0.5, 2.0, 0.02);
                level.playSound(null, x, y, z, SoundEvents.BELL_BLOCK, SoundSource.PLAYERS, 1.0F, 1.2F);
            }
            case CRUSH -> {
                List<LivingEntity> targets = targetsInCone(level, player, 3.0, 0.7);
                if (targets.isEmpty()) {
                    return AbilityResult.FAILED;
                }
                LivingEntity t = targets.stream().min(java.util.Comparator.comparingDouble(e -> e.distanceToSqr(player))).get();
                boolean wasStaggered = CombatHandler.isStaggered(t);
                strike(player, t, atk * 1.4F * (wasStaggered ? 2.0F : 1.0F));
                CombatHandler.addStagger(t, atk * (resonant ? 1.5F : 1.0F));
                pushAway(player, t, 0.8);
                level.sendParticles(ParticleTypes.EXPLOSION, t.getX(), t.getY() + 1.0, t.getZ(), 1, 0, 0, 0, 0);
                level.playSound(null, x, y, z, SoundEvents.ANVIL_LAND, SoundSource.PLAYERS, 0.7F, 0.5F);
            }
            case DAWNLIGHT -> {
                float heal = resonant ? 6.0F : 4.0F;
                for (Player ally : level.getEntitiesOfClass(Player.class, player.getBoundingBox().inflate(6.0),
                        p -> p.isAlive() && !p.isSpectator())) {
                    ally.heal(heal);
                    ally.removeEffect(MobEffects.POISON);
                    ally.removeEffect(MobEffects.WITHER);
                    ally.removeEffect(MobEffects.WEAKNESS);
                    ally.removeEffect(MobEffects.MOVEMENT_SLOWDOWN);
                    ally.removeEffect(com.fixercity.registry.ModEffects.BLEED);
                    if (resonant) {
                        ally.addEffect(new MobEffectInstance(MobEffects.REGENERATION, 80, 1));
                    }
                    level.sendParticles(ParticleTypes.HEART, ally.getX(), ally.getY() + 2.0, ally.getZ(), 3, 0.3, 0.2, 0.3, 0);
                }
                for (LivingEntity t : level.getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(4.0),
                        e -> !(e instanceof Player) && isValidTarget(player, e))) {
                    t.igniteForSeconds(3.0F);
                }
                level.sendParticles(ParticleTypes.FLAME, x, y + 1.0, z, 40, 2.0, 0.6, 2.0, 0.02);
                level.playSound(null, x, y, z, SoundEvents.BEACON_ACTIVATE, SoundSource.PLAYERS, 1.0F, 1.4F);
            }
            case STARE -> {
                List<LivingEntity> targets = targetsInCone(level, player, 10.0, 0.85);
                if (targets.isEmpty()) {
                    return AbilityResult.FAILED;
                }
                for (LivingEntity t : targets) {
                    t.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 60, 2), player);
                    t.addEffect(new MobEffectInstance(MobEffects.WEAKNESS, 60, 0), player);
                    t.addEffect(new MobEffectInstance(MobEffects.GLOWING, 100, 0), player);
                    if (resonant) {
                        CombatHandler.addStagger(t, 8.0F);
                    }
                    level.sendParticles(ParticleTypes.SCULK_SOUL, t.getX(), t.getY() + t.getBbHeight(), t.getZ(), 4, 0.2, 0.2, 0.2, 0.02);
                }
                level.playSound(null, x, y, z, SoundEvents.ELDER_GUARDIAN_CURSE, SoundSource.PLAYERS, 0.4F, 1.5F);
            }
            case THRUST -> {
                Vec3 dir = flatLook(player);
                if (dir == null) {
                    return AbilityResult.FAILED;
                }
                for (LivingEntity t : dash(level, player, dir, 6.0, 0.9, 1.0)) {
                    strike(player, t, atk * 1.3F * (resonant ? 1.2F : 1.0F));
                    CombatHandler.addStagger(t, resonant ? 12.0F : 6.0F);
                }
                trail(level, player.position().add(0, 1, 0), player.position().add(0, 1, 0).add(dir.scale(6)), ParticleTypes.CRIT);
                level.playSound(null, x, y, z, SoundEvents.TRIDENT_THROW.value(), SoundSource.PLAYERS, 1.0F, 1.2F);
            }
            case WHIRLWIND -> {
                double r = resonant ? 4.5 : 3.5;
                float dmg = atk * (resonant ? 1.3F : 1.0F);
                for (LivingEntity t : level.getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(r, 1.0, r),
                        e -> isValidTarget(player, e) && e.distanceToSqr(player) <= r * r)) {
                    strike(player, t, dmg);
                    pushAway(player, t, 0.7);
                }
                for (int i = 0; i < 8; i++) {
                    double a = Math.PI * 2 * i / 8;
                    level.sendParticles(ParticleTypes.SWEEP_ATTACK, x + Math.cos(a) * 2, y + 1.0, z + Math.sin(a) * 2, 1, 0, 0, 0, 0);
                }
                level.playSound(null, x, y, z, SoundEvents.PLAYER_ATTACK_SWEEP, SoundSource.PLAYERS, 1.0F, 0.6F);
            }
            case CHARGE_BURST -> {
                CombatData data = CombatHandler.dataFor(player);
                int c = data.charge;
                data.charge = resonant ? c / 2 : 0;
                float dmg = atk * (1.0F + 0.15F * c);
                for (LivingEntity t : level.getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(3.5, 1.0, 3.5),
                        e -> isValidTarget(player, e) && e.distanceToSqr(player) <= 3.5 * 3.5)) {
                    strike(player, t, dmg);
                    CombatHandler.addStagger(t, resonant ? 15.0F : 8.0F);
                    t.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 40, 1), player);
                }
                level.sendParticles(ParticleTypes.ELECTRIC_SPARK, x, y + 1, z, 60 + c * 10, 2.0, 0.8, 2.0, 0.2);
                level.playSound(null, x, y, z, SoundEvents.LIGHTNING_BOLT_IMPACT, SoundSource.PLAYERS, 0.8F, 1.4F);
            }
            case WARP_STRIKE -> {
                LivingEntity t = lookTarget(level, player, 16.0);
                if (t == null) {
                    return AbilityResult.FAILED;
                }
                Vec3 behind = t.position().subtract(t.getLookAngle().multiply(1, 0, 1).normalize().scale(1.5));
                level.sendParticles(ParticleTypes.PORTAL, x, y + 1, z, 30, 0.3, 0.6, 0.3, 0.3);
                player.teleportTo(behind.x, t.getY(), behind.z);
                strike(player, t, atk * 1.5F);
                CombatHandler.addStagger(t, resonant ? 14.0F : 8.0F);
                if (resonant) {
                    player.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED, 60, 1, false, false, true));
                }
                level.sendParticles(ParticleTypes.REVERSE_PORTAL, behind.x, t.getY() + 1, behind.z, 30, 0.3, 0.6, 0.3, 0.1);
                level.playSound(null, behind.x, t.getY(), behind.z, SoundEvents.ENDERMAN_TELEPORT, SoundSource.PLAYERS, 1.0F, 1.5F);
            }
            case DEVOUR_BITE -> {
                List<LivingEntity> targets = targetsInCone(level, player, 3.0, 0.7);
                if (targets.isEmpty()) {
                    return AbilityResult.FAILED;
                }
                LivingEntity t = targets.stream().min(java.util.Comparator.comparingDouble(e -> e.distanceToSqr(player))).get();
                strike(player, t, atk * 1.6F);
                player.heal(atk * 0.8F);
                if (resonant) {
                    for (LivingEntity e : level.getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(6.0),
                            e -> isValidTarget(player, e))) {
                        e.addEffect(new MobEffectInstance(MobEffects.WEAKNESS, 60, 0), player);
                        e.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 60, 1), player);
                    }
                }
                level.sendParticles(ParticleTypes.DAMAGE_INDICATOR, t.getX(), t.getY() + 1, t.getZ(), 10, 0.3, 0.3, 0.3, 0.1);
                level.playSound(null, x, y, z, SoundEvents.GENERIC_EAT, SoundSource.PLAYERS, 1.2F, 0.5F);
            }
            case PROSELYTE_CUT -> {
                Vec3 dir = flatLook(player);
                if (dir == null) {
                    return AbilityResult.FAILED;
                }
                for (LivingEntity t : dash(level, player, dir, 6.0, 1.6, 1.4)) {
                    strike(player, t, atk * 1.2F);
                    t.addEffect(new MobEffectInstance(com.fixercity.registry.ModEffects.EXPOSED, 120, resonant ? 2 : 1), player);
                    if (resonant) {
                        CombatHandler.addStagger(t, 10.0F);
                    }
                }
                sweep(level, eye, look, 4);
                level.playSound(null, x, y, z, SoundEvents.PLAYER_ATTACK_SWEEP, SoundSource.PLAYERS, 1.0F, 1.1F);
            }
            case CRYING_FLAME -> {
                for (LivingEntity t : targetsInCone(level, player, 8.0, 0.5)) {
                    strike(player, t, atk * 1.1F);
                    t.igniteForSeconds(8.0F);
                    CombatHandler.addStagger(t, 6.0F);
                }
                if (resonant) {
                    player.addEffect(new MobEffectInstance(MobEffects.DAMAGE_RESISTANCE, 80, 1, false, false, true));
                    player.addEffect(new MobEffectInstance(MobEffects.FIRE_RESISTANCE, 160, 0, false, false, true));
                }
                for (double d = 1; d <= 8; d += 0.5) {
                    Vec3 p = eye.add(look.scale(d));
                    level.sendParticles(ParticleTypes.SOUL_FIRE_FLAME, p.x, p.y - 0.3, p.z, 5, 0.12 * d, 0.2, 0.12 * d, 0.02);
                }
                level.playSound(null, x, y, z, SoundEvents.GHAST_SCREAM, SoundSource.PLAYERS, 0.8F, 1.6F);
            }
            case CANE_DISCHARGE -> {
                // 충전을 모두 써서 주변 적 셋에게 전격을 잇는다
                CombatData data = CombatHandler.dataFor(player);
                int c = data.charge;
                List<LivingEntity> near = level.getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(8.0),
                        e -> isValidTarget(player, e));
                if (near.isEmpty()) {
                    return AbilityResult.FAILED;
                }
                near.sort(java.util.Comparator.comparingDouble(e -> e.distanceToSqr(player)));
                Vec3 from = player.position().add(0, 1, 0);
                for (LivingEntity t : near.subList(0, Math.min(3, near.size()))) {
                    strike(player, t, atk * (1.0F + 0.12F * c));
                    CombatHandler.addStagger(t, 6.0F + c);
                    Vec3 to = t.position().add(0, t.getBbHeight() * 0.6, 0);
                    trail(level, from, to, ParticleTypes.ELECTRIC_SPARK);
                    from = to;
                }
                data.charge = resonant ? c / 2 : 0;
                data.chargeSpentAt = level.getGameTime();
                if (resonant) {
                    player.addEffect(new MobEffectInstance(MobEffects.DAMAGE_RESISTANCE, 80, 0, false, false, true));
                }
                if (com.fixercity.keypage.KeyPageHelper.hasPassive(player, com.fixercity.keypage.KeyPagePassive.BADA) && c > 0) {
                    player.addEffect(new MobEffectInstance(MobEffects.ABSORPTION, 200, 0, false, true, true));
                }
                level.playSound(null, x, y, z, SoundEvents.LIGHTNING_BOLT_IMPACT, SoundSource.PLAYERS, 0.7F, 1.6F);
            }
            case PROXY_UNLOCK -> {
                // 돌진해 벤다. 칼날 해방 상태면 훨씬 강하다
                Vec3 dir = flatLook(player);
                if (dir == null) {
                    return AbilityResult.FAILED;
                }
                boolean unlocked = CombatHandler.dataFor(player).combatHits >= com.fixercity.combat.StarPassives.UNLOCK_HITS;
                for (LivingEntity t : dash(level, player, dir, 5.0, 1.5, 1.4)) {
                    strike(player, t, atk * (unlocked ? 1.8F : 1.3F));
                    if (unlocked) {
                        CombatHandler.addStagger(t, 10.0F);
                    }
                    if (resonant) {
                        t.addEffect(new MobEffectInstance(com.fixercity.registry.ModEffects.EXPOSED, 100, 1), player);
                    }
                }
                sweep(level, eye, look, 4);
                level.playSound(null, x, y, z, SoundEvents.PLAYER_ATTACK_SWEEP, SoundSource.PLAYERS, 1.0F, unlocked ? 0.7F : 1.2F);
            }
            case WILDFIRE_SLASH -> {
                List<LivingEntity> targets = targetsInCone(level, player, 5.0, 0.55);
                for (LivingEntity t : targets) {
                    strike(player, t, atk * 1.3F);
                    t.igniteForSeconds(resonant ? 10.0F : 6.0F);
                    CombatHandler.addStagger(t, 5.0F);
                }
                if (resonant) {
                    player.addEffect(new MobEffectInstance(MobEffects.FIRE_RESISTANCE, 200, 0, false, false, true));
                }
                for (double d = 1; d <= 5; d += 0.5) {
                    Vec3 p = eye.add(look.scale(d));
                    level.sendParticles(ParticleTypes.FLAME, p.x, p.y - 0.3, p.z, 6, 0.15 * d, 0.2, 0.15 * d, 0.02);
                }
                level.playSound(null, x, y, z, SoundEvents.BLAZE_SHOOT, SoundSource.PLAYERS, 1.0F, 0.8F);
            }
            case RABBIT_VOLLEY -> {
                // 바라보는 대상에게 3연사, 한 발마다 충전 +1
                LivingEntity t = lookTarget(level, player, 24.0);
                if (t == null) {
                    return AbilityResult.FAILED;
                }
                CombatData data = CombatHandler.dataFor(player);
                for (int i = 0; i < 3; i++) {
                    strike(player, t, atk * 0.8F);
                    data.charge = Math.min(20, data.charge + 1);
                }
                data.chargeGainedAt = level.getGameTime();
                trail(level, eye, t.position().add(0, t.getBbHeight() * 0.6, 0), ParticleTypes.CRIT);
                if (resonant) {
                    player.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED, 60, 1, false, false, true));
                }
                level.playSound(null, x, y, z, SoundEvents.GENERIC_EXPLODE.value(), SoundSource.PLAYERS, 0.4F, 2.0F);
            }
            case RHINO_RUSH -> {
                // 8칸 돌진, 크게 밀쳐 낸다. 충전 20이면 두 배
                Vec3 dir = flatLook(player);
                if (dir == null) {
                    return AbilityResult.FAILED;
                }
                CombatData data = CombatHandler.dataFor(player);
                float mul = data.charge >= 20 ? 2.8F : 1.4F;
                for (LivingEntity t : dash(level, player, dir, 8.0, 1.8, 1.6)) {
                    strike(player, t, atk * mul);
                    CombatHandler.addStagger(t, resonant ? 18.0F : 12.0F);
                    t.knockback(1.6, -dir.x, -dir.z);
                }
                level.playSound(null, x, y, z, SoundEvents.RAVAGER_ROAR, SoundSource.PLAYERS, 0.8F, 1.2F);
            }
            case ANTLER_PULSE -> {
                CombatData data = CombatHandler.dataFor(player);
                float stagger = (10.0F + data.charge / 2.0F) * (resonant ? 1.5F : 1.0F);
                for (LivingEntity t : level.getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(6.0, 1.5, 6.0),
                        e -> isValidTarget(player, e) && e.distanceToSqr(player) <= 36)) {
                    strike(player, t, atk * 0.8F);
                    CombatHandler.addStagger(t, stagger);
                    t.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 60, 1), player);
                }
                level.sendParticles(ParticleTypes.ELECTRIC_SPARK, x, y + 1, z, 80, 3.0, 0.6, 3.0, 0.2);
                level.playSound(null, x, y, z, SoundEvents.BEACON_DEACTIVATE, SoundSource.PLAYERS, 1.0F, 1.6F);
            }
            case GREATER_SPLIT -> {
                // 앞을 크게 두 동강. E.G.O 발현 중이면 더 세다
                boolean ego = level.getGameTime() < CombatHandler.dataFor(player).egoUntil;
                List<LivingEntity> targets = targetsInCone(level, player, 4.5, 0.4);
                for (LivingEntity t : targets) {
                    strike(player, t, atk * (ego ? 3.0F : 2.2F));
                    CombatHandler.addStagger(t, 15.0F);
                }
                if (resonant) {
                    player.addEffect(new MobEffectInstance(MobEffects.DAMAGE_BOOST, 60, 0, false, false, true));
                }
                level.sendParticles(net.minecraft.core.particles.DustParticleOptions.REDSTONE, eye.x + look.x * 2, eye.y - 0.3, eye.z + look.z * 2,
                        60, 1.2, 0.4, 1.2, 0.1);
                sweep(level, eye, look, 4);
                level.playSound(null, x, y, z, SoundEvents.PLAYER_ATTACK_SWEEP, SoundSource.PLAYERS, 1.2F, 0.5F);
            }
            case STANCE_SHIFT -> {
                // 자세를 다음으로 바꾸고 앞의 적을 그 자세로 벤다 (참격 → 관통 → 타격 → 수비)
                CombatData data = CombatHandler.dataFor(player);
                data.stance = (data.stance + 1) % 4;
                player.displayClientMessage(Component.translatable("message.fixercity.stance",
                        Component.translatable("stance.fixercity." + data.stance)).withStyle(ChatFormatting.LIGHT_PURPLE), true);
                if (data.stance == 3) {
                    player.addEffect(new MobEffectInstance(MobEffects.DAMAGE_RESISTANCE, 60, 1, false, false, true));
                } else {
                    for (LivingEntity t : targetsInCone(level, player, 3.5, 0.6)) {
                        strike(player, t, atk * (resonant ? 1.6F : 1.3F));
                    }
                }
                level.sendParticles(ParticleTypes.WITCH, x, y + 1, z, 20, 0.5, 0.6, 0.5, 0.05);
                level.playSound(null, x, y, z, SoundEvents.AMETHYST_BLOCK_CHIME, SoundSource.PLAYERS, 1.2F, 1.0F);
            }
            case MESSENGER_DECREE -> {
                // 주변 아군 힘 + 앞의 적 강타
                for (Player ally : level.getEntitiesOfClass(Player.class, player.getBoundingBox().inflate(8.0), p -> p.isAlive() && !p.isSpectator())) {
                    ally.addEffect(new MobEffectInstance(MobEffects.DAMAGE_BOOST, 160, resonant ? 1 : 0, false, true, true));
                }
                for (LivingEntity t : targetsInCone(level, player, 4.0, 0.5)) {
                    strike(player, t, atk * 1.4F);
                    CombatHandler.addStagger(t, 8.0F);
                }
                level.sendParticles(ParticleTypes.END_ROD, x, y + 1.5, z, 30, 2.0, 0.5, 2.0, 0.02);
                level.playSound(null, x, y, z, SoundEvents.BELL_BLOCK, SoundSource.PLAYERS, 1.0F, 0.8F);
            }
            case CHINK_THRUST -> {
                // 한 대상을 깊게 찌른다. 흐트러진 대상은 3배, 수비를 무너뜨린다
                List<LivingEntity> targets = targetsInCone(level, player, 3.5, 0.8);
                if (targets.isEmpty()) {
                    return AbilityResult.FAILED;
                }
                LivingEntity t = targets.stream().min(java.util.Comparator.comparingDouble(e -> e.distanceToSqr(player))).get();
                CombatData td = t.getData(com.fixercity.registry.ModAttachments.COMBAT);
                td.guardUntil = 0;
                td.counterUntil = 0;
                strike(player, t, atk * (CombatHandler.isStaggered(t) ? 3.0F : 1.8F));
                CombatHandler.addStagger(t, resonant ? 10.0F : 5.0F);
                level.sendParticles(ParticleTypes.CRIT, t.getX(), t.getY() + 1, t.getZ(), 15, 0.2, 0.3, 0.2, 0.3);
                level.playSound(null, x, y, z, SoundEvents.TRIDENT_HIT, SoundSource.PLAYERS, 1.0F, 1.4F);
            }
            case SMOKE_BURST -> {
                // 쌓인 연기를 모두 터뜨려 주변 실명 + 피해
                CombatData data = CombatHandler.dataFor(player);
                int s = data.smoke;
                for (LivingEntity t : level.getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(4.0, 1.0, 4.0),
                        e -> isValidTarget(player, e) && e.distanceToSqr(player) <= 16)) {
                    strike(player, t, atk * (1.0F + 0.1F * s));
                    t.addEffect(new MobEffectInstance(MobEffects.BLINDNESS, 60 + s * 6, 0), player);
                    CombatHandler.addStagger(t, 4.0F + s);
                }
                data.smoke = resonant ? s / 2 : 0;
                level.sendParticles(ParticleTypes.LARGE_SMOKE, x, y + 1, z, 60 + s * 8, 2.0, 0.8, 2.0, 0.03);
                level.playSound(null, x, y, z, SoundEvents.FIRE_EXTINGUISH, SoundSource.PLAYERS, 1.0F, 0.6F);
            }
            case TRIGRAM_CUT -> {
                // 돌진해 베고 다음 괘를 바로 받는다
                Vec3 dir = flatLook(player);
                if (dir == null) {
                    return AbilityResult.FAILED;
                }
                for (LivingEntity t : dash(level, player, dir, 5.0, 1.5, 1.4)) {
                    strike(player, t, atk * 1.3F);
                    CombatHandler.addStagger(t, 6.0F);
                }
                com.fixercity.keypage.KeyPage page = com.fixercity.keypage.KeyPageHelper.getPage(player);
                if (page != null && resonant) {
                    com.fixercity.combat.StarPassives.advanceTrigram(player, page.passive(), CombatHandler.dataFor(player), level.getGameTime());
                    player.addEffect(new MobEffectInstance(MobEffects.ABSORPTION, 200, 0, false, true, true));
                }
                sweep(level, eye, look, 4);
                level.playSound(null, x, y, z, SoundEvents.PLAYER_ATTACK_SWEEP, SoundSource.PLAYERS, 1.0F, 1.0F);
            }
            case RIPOSTE -> {
                CombatData data = CombatHandler.dataFor(player);
                data.counterUntil = level.getGameTime() + (resonant ? 50 : 30);
                data.counterPower = resonant ? 2.5F : 2.0F;
                level.sendParticles(ParticleTypes.ENCHANTED_HIT, x, y + 1.0, z, 12, 0.4, 0.5, 0.4, 0.1);
                level.playSound(null, x, y, z, SoundEvents.SHIELD_BLOCK, SoundSource.PLAYERS, 0.8F, 1.6F);
            }
        }
        return AbilityResult.USED;
    }

    private static LivingEntity lookTarget(ServerLevel level, Player player, double range) {
        Vec3 eye = player.getEyePosition();
        Vec3 look = player.getViewVector(1.0F);
        Vec3 end = eye.add(look.scale(range));
        AABB box = player.getBoundingBox().expandTowards(look.scale(range)).inflate(1.0);
        EntityHitResult hit = ProjectileUtil.getEntityHitResult(level, player, eye, end, box,
                e -> e instanceof LivingEntity l && isValidTarget(player, l));
        return hit != null && hit.getEntity() instanceof LivingEntity l ? l : null;
    }

    private static void sweep(ServerLevel level, Vec3 eye, Vec3 look, int count) {
        for (int i = 1; i <= count; i++) {
            Vec3 p = eye.add(look.scale(i));
            level.sendParticles(ParticleTypes.SWEEP_ATTACK, p.x, p.y - 0.3, p.z, 1, 0, 0, 0, 0);
        }
    }

    private static void trail(ServerLevel level, Vec3 from, Vec3 to, net.minecraft.core.particles.SimpleParticleType type) {
        Vec3 d = to.subtract(from);
        int steps = (int) Math.max(1, d.length() * 2);
        for (int i = 0; i <= steps; i++) {
            Vec3 p = from.add(d.scale(i / (double) steps));
            level.sendParticles(type, p.x, p.y, p.z, 1, 0, 0, 0, 0);
        }
    }
}
