package com.fixercity.combat;

import com.fixercity.item.GunItem;
import com.fixercity.keypage.DamageKind;
import com.fixercity.keypage.KeyPage;
import com.fixercity.keypage.KeyPageHelper;
import com.fixercity.keypage.KeyPagePassive;
import com.fixercity.keypage.Resist;
import com.fixercity.registry.ModAttachments;
import com.fixercity.registry.ModEffects;
import com.fixercity.registry.ModItems;
import java.util.List;
import net.minecraft.ChatFormatting;
import net.minecraft.core.Holder;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.effect.MobEffect;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.neoforge.event.entity.living.LivingDeathEvent;

/**
 * 도시의 별 · 하나 협회 인물 책장의 패시브.
 * 원작의 "감정 단계"는 전투 중에 쌓이는 단계(0~5)로 옮겼다: 때리기 +1, 맞기 +1, 처치 +4, 8점마다 한 단계.
 * 30초 동안 싸우지 않으면 0으로 돌아간다.
 */
public final class StarPassives {
    private StarPassives() {}

    public static final int EMOTION_STEP = 8;
    public static final int EMOTION_MAX = 5;
    private static final long OUT_OF_COMBAT = 600;

    // ---------------------------------------------------------------- 분류

    private static boolean has(LivingEntity e, KeyPagePassive p) {
        return KeyPageHelper.hasPassive(e, p);
    }

    private static KeyPagePassive passive(LivingEntity e) {
        KeyPage page = KeyPageHelper.getPage(e);
        return page == null ? null : page.passive();
    }

    /** 이 책장이 감정 단계를 쓰는지 (도시의 별 · 하나 협회 인물). */
    public static boolean usesEmotion(KeyPagePassive p) {
        return p != null && p.ordinal() >= KeyPagePassive.DONG_HWAN.ordinal();
    }

    /** 속도 III: 감정 3단계부터 신속. */
    private static boolean hasSpeed3(KeyPagePassive p) {
        return switch (p) {
            case DONG_HWAN, LOWELL, KALO, ESTHER, XIAO, RED_MIST, NIKOLAI, PURPLE_TEAR, YAN, ALLEN, IRINA, YAE, BAYARD,
                    MIRINAE, HAROLD, OLIVIER -> true;
            default -> false;
        };
    }

    /** 열의: 감정 3단계부터 공격 피해 +10%. */
    private static boolean hasFervor(KeyPagePassive p) {
        return switch (p) {
            case DONG_HWAN, LOWELL, CECIL, MEI, CHUN, XIAO, MIRIS -> true;
            default -> false;
        };
    }

    /** 충전을 쓰는 책장과 최대 충전량. */
    public static int chargeCap(KeyPagePassive p) {
        if (p == null) {
            return 0;
        }
        return switch (p) {
            case NEMO, MARTINA, BADA -> 10;
            case NIKOLAI, MYO, MAXIM, RUDOLPH -> 20;
            default -> 0;
        };
    }

    private static boolean ammoSupply(KeyPagePassive p) {
        return p == KeyPagePassive.KALO || p == KeyPagePassive.BORIS || p == KeyPagePassive.KATRIEL || p == KeyPagePassive.DENIS;
    }

    private static boolean lockedPotential(KeyPagePassive p) {
        return p == KeyPagePassive.ESTHER || p == KeyPagePassive.HUBERT || p == KeyPagePassive.GLORIA;
    }

    private static boolean trigrams(KeyPagePassive p) {
        return p == KeyPagePassive.HANA_FIXER || p == KeyPagePassive.MIRINAE || p == KeyPagePassive.HAROLD || p == KeyPagePassive.OLIVIER;
    }

    private static boolean allForHana(KeyPagePassive p) {
        return p == KeyPagePassive.HAROLD || p == KeyPagePassive.OLIVIER;
    }

    /** 칼날 해방: 한 전투에서 12번 적중하면 풀린다. */
    public static final int UNLOCK_HITS = 12;

    // ---------------------------------------------------------------- 감정 단계

    public static void addEmotion(Player player, int points) {
        KeyPagePassive p = passive(player);
        if (!usesEmotion(p)) {
            return;
        }
        CombatData d = player.getData(ModAttachments.COMBAT);
        long now = player.level().getGameTime();
        d.lastCombat = now;
        if (d.emotion >= EMOTION_MAX) {
            return;
        }
        d.emotionPoints += points;
        while (d.emotionPoints >= EMOTION_STEP && d.emotion < EMOTION_MAX) {
            d.emotionPoints -= EMOTION_STEP;
            d.emotion++;
            onEmotionRise(player, p, d);
        }
    }

    private static void onEmotionRise(Player player, KeyPagePassive p, CombatData d) {
        player.displayClientMessage(Component.translatable("message.fixercity.emotion", d.emotion).withStyle(ChatFormatting.GOLD), true);
        if (player.level() instanceof ServerLevel level) {
            level.sendParticles(ParticleTypes.HAPPY_VILLAGER, player.getX(), player.getY() + 2.1, player.getZ(), 6, 0.3, 0.1, 0.3, 0);
        }
        long now = player.level().getGameTime();
        switch (p) {
            // 물러서지 않는 투사: 단계가 오를 때마다 힘·인내 1 (최대 2)
            case LOWELL -> {
                d.lowellStacks = Math.min(2, d.lowellStacks + 1);
                player.addEffect(new MobEffectInstance(MobEffects.DAMAGE_BOOST, 600, d.lowellStacks - 1, false, true, true));
                player.addEffect(new MobEffectInstance(MobEffects.DAMAGE_RESISTANCE, 600, d.lowellStacks - 1, false, true, true));
            }
            // 태산처럼 굳건히: 최대 체력 15% 회복 (최대 4칸)
            case CECIL -> player.heal(Math.min(player.getMaxHealth() * 0.15F, 8.0F));
            // 거안사위: 흐트러짐 저항 25% 회복 (흐트러진 중이 아니면)
            case MEI -> {
                CombatData cd = CombatHandler.dataFor(player);
                if (!cd.isStaggered(now)) {
                    cd.restore(now, CombatHandler.staggerMax(player), 0.25F);
                }
            }
            // 전설: 감정 4단계에 E.G.O 발현 (목숨당 한 번)
            case RED_MIST -> {
                if (d.emotion >= 4 && !d.egoUsed) {
                    manifestEgo(player, d);
                }
            }
            default -> {
            }
        }
    }

    private static void manifestEgo(Player player, CombatData d) {
        d.egoUsed = true;
        d.egoUntil = player.level().getGameTime() + 600;
        player.addEffect(new MobEffectInstance(MobEffects.DAMAGE_BOOST, 600, 1, false, true, true));
        player.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED, 600, 1, false, true, true));
        player.addEffect(new MobEffectInstance(MobEffects.DAMAGE_RESISTANCE, 600, 0, false, true, true));
        player.heal(player.getMaxHealth() * 0.3F);
        if (player.level() instanceof ServerLevel level) {
            level.sendParticles(net.minecraft.core.particles.DustParticleOptions.REDSTONE, player.getX(), player.getY() + 1, player.getZ(),
                    80, 0.8, 1.0, 0.8, 0.1);
            level.playSound(null, player.getX(), player.getY(), player.getZ(), SoundEvents.WITHER_SPAWN, SoundSource.PLAYERS, 0.6F, 1.6F);
        }
        player.displayClientMessage(Component.translatable("message.fixercity.ego").withStyle(ChatFormatting.DARK_RED, ChatFormatting.BOLD), true);
    }

    // ---------------------------------------------------------------- 매 틱

    public static void tick(Player player, KeyPage page) {
        KeyPagePassive p = page.passive();
        CombatData d = player.getData(ModAttachments.COMBAT);
        long now = player.level().getGameTime();
        // 전투가 끝나면 감정 단계, 칼날 해방, 연기 등을 초기화
        if (d.emotion > 0 || d.emotionPoints > 0 || d.combatHits > 0) {
            if (now - d.lastCombat > OUT_OF_COMBAT) {
                d.emotion = 0;
                d.emotionPoints = 0;
                d.combatHits = 0;
                d.lowellStacks = 0;
                d.combatStart = 0;
            }
        }
        if (now - d.lastCombat > 60 && d.smoke > 0 && player.tickCount % 60 == 0) {
            d.smoke--;
        }
        if (hasSpeed3(p) && d.emotion >= 3) {
            effect(player, MobEffects.MOVEMENT_SPEED, 0);
        }
        boolean second = player.tickCount % 20 == 0;
        switch (p) {
            // 강인함: 보호 (감정 3단계부터 더 강하게)
            case DONG_HWAN -> effect(player, MobEffects.DAMAGE_RESISTANCE, d.emotion >= 5 ? 1 : 0);
            // 두목의 명령: 10초마다 주변 아군 둘에게 보호 1
            case KALO -> {
                if (player.tickCount % 200 == 0) {
                    List<Player> allies = nearbyAllies(player, 8.0);
                    java.util.Collections.shuffle(allies);
                    for (Player ally : allies.subList(0, Math.min(2, allies.size()))) {
                        ally.addEffect(new MobEffectInstance(MobEffects.DAMAGE_RESISTANCE, 200, 0, true, true, true));
                    }
                }
            }
            // 충전 방패 / 에너지 방출 (감정 2단계부터, 최근 5초)
            case NEMO, MARTINA, BADA -> {
                if (d.emotion >= 2 && now - d.chargeGainedAt < 100) {
                    effect(player, MobEffects.DAMAGE_RESISTANCE, 0);
                }
                if (d.emotion >= 2 && now - d.chargeSpentAt < 100) {
                    effect(player, MobEffects.DAMAGE_BOOST, 0);
                }
            }
            // 지휘관: 충전 11 이상이면 주변 아군(자신 포함) 힘·보호
            case NIKOLAI -> {
                if (d.charge >= 11 && second) {
                    for (Player ally : alliesAndSelf(player, 8.0)) {
                        ally.addEffect(new MobEffectInstance(MobEffects.DAMAGE_BOOST, 40, 0, true, true, true));
                        ally.addEffect(new MobEffectInstance(MobEffects.DAMAGE_RESISTANCE, 40, 0, true, true, true));
                    }
                }
            }
            // 토끼 강화 시술 / 압축 충전 자극 근력: 잃은 체력 30%마다 신속, 충전 11 이상이면 한 단계 더
            case MYO -> {
                int amp = lostSteps(player, 3) + (d.charge >= 11 ? 1 : 0);
                if (amp > 0) {
                    effect(player, MobEffects.MOVEMENT_SPEED, Math.min(2, amp - 1));
                }
            }
            // 코뿔소 시술 / 생체 충전 동기화 외피: 잃은 체력 30%마다 인내(최대 2), 충전 11 이상이면 흡수
            case MAXIM -> {
                int amp = lostSteps(player, 2);
                if (amp > 0) {
                    effect(player, MobEffects.DAMAGE_RESISTANCE, amp - 1);
                }
                if (d.charge >= 11 && player.tickCount % 100 == 0 && player.getAbsorptionAmount() < 4.0F) {
                    player.addEffect(new MobEffectInstance(MobEffects.ABSORPTION, 120, 0, true, true, true));
                }
            }
            // 순록 처치: 잃은 체력 30%마다 힘 (최대 2)
            case RUDOLPH -> {
                int amp = lostSteps(player, 2);
                if (amp > 0) {
                    effect(player, MobEffects.DAMAGE_BOOST, amp - 1);
                }
            }
            // 전령: 10초마다 가장 가까운 아군(없으면 자신)에게 무작위 강화
            case YAN -> {
                if (player.tickCount % 200 == 0) {
                    Player target = nearbyAllies(player, 10.0).stream()
                            .min(java.util.Comparator.comparingDouble(a -> a.distanceToSqr(player))).orElse(player);
                    Holder<MobEffect>[] pool = effectPool();
                    target.addEffect(new MobEffectInstance(pool[player.getRandom().nextInt(pool.length)], 200, 0, false, true, true));
                    target.displayClientMessage(Component.translatable("message.fixercity.messenger").withStyle(ChatFormatting.LIGHT_PURPLE), true);
                }
            }
            // 증권 양식: 10초마다 나약함·구속·피로 제거 / 생명 보험: 체력 30% 이하에서 1분마다 흡수 II + 재생
            case IRINA -> {
                if (player.tickCount % 200 == 0) {
                    player.removeEffect(MobEffects.WEAKNESS);
                    player.removeEffect(MobEffects.MOVEMENT_SLOWDOWN);
                    player.removeEffect(MobEffects.DIG_SLOWDOWN);
                }
                if (player.getHealth() <= player.getMaxHealth() * 0.3F && now >= d.insuranceReadyAt) {
                    d.insuranceReadyAt = now + 1200;
                    player.addEffect(new MobEffectInstance(MobEffects.ABSORPTION, 200, 1, false, true, true));
                    player.addEffect(new MobEffectInstance(MobEffects.REGENERATION, 100, 0, false, true, true));
                    player.displayClientMessage(Component.translatable("message.fixercity.insurance").withStyle(ChatFormatting.GREEN), true);
                }
            }
            // 연기 넘침(8 이상: 힘) / 광기: 15초마다 무작위 효과 (힘·신속·저항 II 또는 취약)
            case YAE -> {
                if (d.smoke >= 8) {
                    effect(player, MobEffects.DAMAGE_BOOST, 0);
                }
                if (player.tickCount % 300 == 0) {
                    int roll = player.getRandom().nextInt(4);
                    Component name;
                    switch (roll) {
                        case 0 -> {
                            player.addEffect(new MobEffectInstance(MobEffects.DAMAGE_BOOST, 300, 1, false, true, true));
                            name = Component.translatable("effect.minecraft.strength");
                        }
                        case 1 -> {
                            player.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED, 300, 1, false, true, true));
                            name = Component.translatable("effect.minecraft.speed");
                        }
                        case 2 -> {
                            player.addEffect(new MobEffectInstance(MobEffects.DAMAGE_RESISTANCE, 300, 1, false, true, true));
                            name = Component.translatable("effect.minecraft.resistance");
                        }
                        default -> {
                            d.fragileUntil = now + 300;
                            name = Component.translatable("message.fixercity.fragile");
                        }
                    }
                    player.displayClientMessage(Component.translatable("message.fixercity.madness", name).withStyle(ChatFormatting.DARK_PURPLE), true);
                }
            }
            // 대비 자세: 묶였거나(구속 II 이상) 흐트러졌다 풀리면 힘 + 저항 II
            case BAYARD -> {
                MobEffectInstance slow = player.getEffect(MobEffects.MOVEMENT_SLOWDOWN);
                boolean bound = (slow != null && slow.getAmplifier() >= 1) || d.isStaggered(now);
                if (bound) {
                    d.boundAt = now;
                } else if (d.boundAt > 0 && now - d.boundAt < 5) {
                    d.boundAt = 0;
                    player.addEffect(new MobEffectInstance(MobEffects.DAMAGE_BOOST, 100, 0, false, true, true));
                    player.addEffect(new MobEffectInstance(MobEffects.DAMAGE_RESISTANCE, 100, 1, false, true, true));
                }
                // 투지: 전투 중 5초 동안 공격하지 않으면 재생
                if (now - d.lastCombat < OUT_OF_COMBAT && now - d.lastDealt > 100 && second) {
                    effect(player, MobEffects.REGENERATION, 0);
                }
            }
            default -> {
            }
        }
        if (trigrams(p)) {
            tickTrigrams(player, p, d, now);
        }
    }

    @SuppressWarnings("unchecked")
    private static Holder<MobEffect>[] effectPool() {
        return new Holder[] {MobEffects.DAMAGE_BOOST, MobEffects.DAMAGE_RESISTANCE, MobEffects.MOVEMENT_SPEED, MobEffects.REGENERATION};
    }

    /** 사괘: 20초마다 건(힘)·곤(저항)·감(재생)·리(신속)를 돌아가며 받는다. 넷을 다 쓰기 전엔 같은 괘가 나오지 않는다. */
    private static final String[] TRIGRAM_NAMES = {"geon", "gon", "gam", "ri"};

    private static void tickTrigrams(Player player, KeyPagePassive p, CombatData d, long now) {
        if (now < d.trigramNextAt) {
            return;
        }
        advanceTrigram(player, p, d, now);
    }

    public static void advanceTrigram(Player player, KeyPagePassive p, CombatData d, long now) {
        d.trigramNextAt = now + 400;
        if (d.trigramUsed == 0b1111) {
            d.trigramUsed = 0;
        }
        int pick;
        do {
            pick = player.getRandom().nextInt(4);
        } while ((d.trigramUsed & (1 << pick)) != 0);
        d.trigramUsed |= 1 << pick;
        Holder<MobEffect> effect = effectPool()[pick];
        player.addEffect(new MobEffectInstance(effect, 400, 0, false, true, true));
        player.displayClientMessage(Component.translatable("message.fixercity.trigram",
                Component.translatable("trigram.fixercity." + TRIGRAM_NAMES[pick])).withStyle(ChatFormatting.AQUA), true);
        // 모두를 위한 하나: 같은 강화를 가까운 아군 하나에게도
        if (p == KeyPagePassive.MIRINAE) {
            nearbyAllies(player, 8.0).stream().min(java.util.Comparator.comparingDouble(a -> a.distanceToSqr(player)))
                    .ifPresent(a -> a.addEffect(new MobEffectInstance(effect, 400, 0, false, true, true)));
        }
    }

    // ---------------------------------------------------------------- 공격

    /** 공격 쪽 배율. [0] 피해 배율, [1] 흐트러짐 배율, [2] 더하는 피해, [3] 더하는 흐트러짐. */
    public static float[] onAttack(ServerLevel level, Player player, LivingEntity target, DamageKind kind, KeyPagePassive p) {
        float[] r = {1.0F, 1.0F, 0.0F, 0.0F};
        CombatData d = player.getData(ModAttachments.COMBAT);
        long now = level.getGameTime();
        boolean gun = player.getMainHandItem().getItem() instanceof GunItem;
        boolean idleBefore = now - d.lastDealt > 60;
        if (d.combatStart == 0 || now - d.lastCombat > OUT_OF_COMBAT) {
            d.combatStart = now;
        }
        d.combatHits++;
        addEmotion(player, 1);

        if (hasFervor(p) && d.emotion >= 3) {
            r[0] *= 1.1F;
        }
        int cap = chargeCap(p);
        if (cap > 0) {
            d.charge = Math.min(cap, d.charge + 1);
            d.chargeGainedAt = now;
            player.displayClientMessage(Component.translatable("message.fixercity.charge_cap", d.charge, cap).withStyle(ChatFormatting.YELLOW), true);
        }
        // 탄약 보급: 근접 3번 적중마다 탄환 1
        if (ammoSupply(p) && !gun && ++d.ammoCounter >= 3) {
            d.ammoCounter = 0;
            give(player, new ItemStack(ModItems.FIXER_BULLET.get()));
        }
        if (lockedPotential(p) && d.combatHits == UNLOCK_HITS) {
            player.displayClientMessage(Component.translatable("message.fixercity.blade_unlocked").withStyle(ChatFormatting.GOLD, ChatFormatting.BOLD), true);
            level.playSound(null, player.getX(), player.getY(), player.getZ(), SoundEvents.ANVIL_USE, SoundSource.PLAYERS, 0.6F, 1.8F);
        }
        if (lockedPotential(p) && d.combatHits >= UNLOCK_HITS) {
            r[0] *= 1.15F;
            r[1] *= 1.15F;
        }
        switch (p) {
            // 흉터를 새기는 자: 5초마다 첫 공격에 출혈 2 / 파열 상처: 출혈 중인 대상 +3
            case DONG_HWAN -> {
                if (target.hasEffect(ModEffects.BLEED)) {
                    r[2] += 3.0F;
                }
                if (now - d.scarAt >= 100) {
                    d.scarAt = now;
                    target.addEffect(new MobEffectInstance(ModEffects.BLEED, 100, 1), player);
                }
            }
            // 세 번째의 집념: 세 번째 공격마다 +25%, 1분 넘게 싸우면 항상 +10%
            case KALO -> {
                if (d.combatHits % 3 == 0) {
                    r[0] *= 1.25F;
                }
                if (now - d.combatStart > 1200) {
                    r[0] *= 1.1F;
                }
            }
            // 강화된 첫 발: 3초 쉬고 쏜 첫 발 +40%
            case KATRIEL -> {
                if (gun && idleBefore) {
                    r[0] *= 1.4F;
                }
            }
            // 추가 보급: 총으로 3번 맞히면 탄환 1
            case DENIS -> {
                if (gun && ++d.ammoCounter >= 3) {
                    d.ammoCounter = 0;
                    give(player, new ItemStack(ModItems.FIXER_BULLET.get()));
                }
            }
            // 무거운 마음의 강음: 흐트러짐 피해 +2~4
            case MARTINA -> r[3] += 2.0F + level.random.nextInt(3);
            // 끝없는 급류: 6번 적중마다 무기 재사용 대기 초기화
            case ESTHER -> {
                if (d.combatHits % 6 == 0) {
                    player.getCooldowns().removeCooldown(player.getMainHandItem().getItem());
                }
            }
            // 짓누르는 압박: 대상 약점 노출 (3초)
            case HUBERT -> target.addEffect(new MobEffectInstance(ModEffects.EXPOSED, 60, 0), player);
            // 하늘을 가르는 노염: 화상이 두 배 (6초 점화)
            case CHUN -> target.igniteForSeconds(6.0F);
            // 들불의 기세: 근접 적중 시 점화
            case XIAO -> target.igniteForSeconds(4.0F);
            // 섶을 지고 불로: 불타는 대상에게 흐트러짐 +4
            case MIRIS -> {
                if (target.isOnFire()) {
                    r[3] += 4.0F;
                }
                target.igniteForSeconds(2.0F);
            }
            // 최강: E.G.O 발현 중 피해 +20%
            case RED_MIST -> {
                if (now < d.egoUntil) {
                    r[0] *= 1.2F;
                }
            }
            // 마무리: 때린 대상을 표식 (한 명만). 표식 대상은 모두에게서 50% 더 받는다
            case NIKOLAI -> markTarget(level, player, d, target, now);
            // 묘의 기량: 나보다 느린 대상 +20%
            case MYO -> {
                if (target.getAttributeValue(Attributes.MOVEMENT_SPEED) < player.getAttributeValue(Attributes.MOVEMENT_SPEED)) {
                    r[0] *= 1.2F;
                }
            }
            // 최대 돌격: 충전 20이면 피해·흐트러짐 +50%
            case MAXIM -> {
                if (d.charge >= 20) {
                    r[0] *= 1.5F;
                    r[1] *= 1.5F;
                }
            }
            // 뇌파 충전 집중 뿔: 충전 11 이상이면 흐트러짐 +3
            case RUDOLPH -> {
                if (d.charge >= 11) {
                    r[3] += 3.0F;
                }
            }
            // 확률을 다루는 자: 15% 확률로 피해 1.5배
            case PURPLE_TEAR -> {
                if (level.random.nextFloat() < 0.15F) {
                    r[0] *= 1.5F;
                    level.sendParticles(ParticleTypes.WITCH, target.getX(), target.getY() + 1, target.getZ(), 8, 0.3, 0.3, 0.3, 0.05);
                }
                if (d.stance == 3) {
                    r[0] *= 0.8F;
                }
            }
            // 얀샋ㄷ요무: 체력 절반 아래 +15%, 4분의 1 아래 +30%와 흐트러짐 +3
            case YAN -> {
                float hp = player.getHealth() / player.getMaxHealth();
                if (hp < 0.25F) {
                    r[0] *= 1.3F;
                    r[3] += 3.0F;
                } else if (hp < 0.5F) {
                    r[0] *= 1.15F;
                }
            }
            // 스틸레토: 관통 +40%, 참격·타격 -40% / 자비: 체력 20% 아래 대상 +50% / 갑옷의 틈: 나보다 느리면 수비 무너뜨림
            case ALLEN -> {
                r[0] *= kind == DamageKind.PIERCE ? 1.4F : 0.6F;
                if (target.getHealth() < target.getMaxHealth() * 0.2F) {
                    r[0] *= 1.5F;
                }
                if (target.getAttributeValue(Attributes.MOVEMENT_SPEED) * 1.3 < player.getAttributeValue(Attributes.MOVEMENT_SPEED)) {
                    CombatData td = target.getData(ModAttachments.COMBAT);
                    td.guardUntil = 0;
                    td.counterUntil = 0;
                    r[3] += 3.0F;
                }
            }
            // 보험금: 공격하면 맞은 횟수 초기화
            case IRINA -> d.hitStreak = 0;
            // 뿌연 안개: 연기 1당 피해 +3% / 과잉 공급: 연기 10이면 +2
            case YAE -> {
                d.smoke = Math.min(10, d.smoke + 1);
                r[0] *= 1.0F + 0.03F * d.smoke;
                if (d.smoke >= 10) {
                    r[2] += 2.0F;
                }
            }
            // 공세 자세: 주는 피해 +15% (받는 피해도 늘어난다)
            case BAYARD -> r[0] *= 1.15F;
            // 열두 해결사: 최소 피해 +2, 감정 3단계부터 +3
            case OLIVIER -> r[2] += d.emotion >= 3 ? 3.0F : 2.0F;
            default -> {
            }
        }
        return r;
    }

    private static void markTarget(ServerLevel level, Player player, CombatData d, LivingEntity target, long now) {
        if (d.markedTarget != null && !d.markedTarget.equals(target.getUUID())) {
            Entity old = level.getEntity(d.markedTarget);
            if (old instanceof LivingEntity l) {
                l.getData(ModAttachments.COMBAT).markedUntil = 0;
                l.removeEffect(MobEffects.GLOWING);
            }
        }
        d.markedTarget = target.getUUID();
        CombatData td = target.getData(ModAttachments.COMBAT);
        if (td.markedUntil < now) {
            td.markedFrom = now + 20; // 표식을 남긴 공격 자체에는 붙지 않는다
        }
        td.markedUntil = now + 200;
        target.addEffect(new MobEffectInstance(MobEffects.GLOWING, 200, 0), player);
    }

    // ---------------------------------------------------------------- 방어

    /** 맞는 쪽 배율 (내성 전에 곱한다). 표식, 취약, 수비 자세 등. */
    public static float defendMultiplier(ServerLevel level, LivingEntity target, LivingEntity attacker, DamageKind kind) {
        float mul = 1.0F;
        long now = level.getGameTime();
        CombatData td = target.getData(ModAttachments.COMBAT);
        if (kind != null && now < td.markedUntil && now >= td.markedFrom) {
            mul *= 1.5F;
        }
        if (now < td.fragileUntil) {
            mul *= 1.25F;
        }
        KeyPagePassive p = passive(target);
        if (p == null) {
            return mul;
        }
        if (target instanceof Player player && kind != null) {
            addEmotion(player, 1);
        }
        switch (p) {
            case MAXIM -> {
                if (td.charge >= 20) {
                    mul *= 0.7F;
                }
            }
            case BAYARD -> mul *= 1.25F;
            case PURPLE_TEAR -> {
                if (td.stance == 3 && kind != null) {
                    mul *= 0.6F;
                }
            }
            case IRINA -> {
                if (kind != null && target instanceof Player player && ++td.hitStreak >= 3) {
                    td.hitStreak = 0;
                    player.getCooldowns().removeCooldown(player.getMainHandItem().getItem());
                    player.displayClientMessage(Component.translatable("message.fixercity.insurance_benefit").withStyle(ChatFormatting.GREEN), true);
                }
            }
            default -> {
            }
        }
        return mul;
    }

    /** 모두를 위한 하나: 지난 5초 동안 가장 많이 받은 유형은 견딤으로. */
    public static Resist adjustResist(LivingEntity target, DamageKind kind, Resist resist) {
        if (kind == null || !allForHana(passive(target))) {
            return resist;
        }
        CombatData td = target.getData(ModAttachments.COMBAT);
        if (target.level().getGameTime() - td.recentDamageAt > 100) {
            return resist;
        }
        int most = 0;
        for (int i = 1; i < 3; i++) {
            if (td.recentDamage[i] > td.recentDamage[most]) {
                most = i;
            }
        }
        if (most == kind.ordinal() && td.recentDamage[most] > 0 && resist.multiplier() > Resist.ENDURE.multiplier()) {
            return Resist.ENDURE;
        }
        return resist;
    }

    /** 최종 피해가 정해진 뒤. 반환값이 최종 피해. 근성, 응급 소생, 반격, 받은 피해 기록. */
    public static float afterDamage(ServerLevel level, LivingEntity target, LivingEntity attacker, DamageKind kind, float amount, boolean melee) {
        KeyPagePassive p = passive(target);
        if (p == null) {
            return amount;
        }
        long now = level.getGameTime();
        CombatData td = target.getData(ModAttachments.COMBAT);
        if (allForHana(p) && kind != null) {
            if (now - td.recentDamageAt > 100) {
                td.recentDamage[0] = td.recentDamage[1] = td.recentDamage[2] = 0;
            }
            td.recentDamage[kind.ordinal()] += amount;
            td.recentDamageAt = now;
        }
        switch (p) {
            // 근성: 받는 모든 피해 -1
            case BORIS -> amount = Math.max(0.0F, amount - 1.0F);
            // 반격: 근접 공격을 받으면 30% 확률로 4~8 참격 반격
            case RED_MIST -> {
                if (melee && attacker != null && level.random.nextFloat() < 0.3F) {
                    attacker.invulnerableTime = 0;
                    attacker.hurt(target instanceof Player pl ? pl.damageSources().playerAttack(pl) : target.damageSources().mobAttack(target),
                            4.0F + level.random.nextInt(5));
                    level.sendParticles(ParticleTypes.SWEEP_ATTACK, attacker.getX(), attacker.getY() + 1, attacker.getZ(), 2, 0.2, 0.2, 0.2, 0);
                }
            }
            // 응급 소생 규약: 죽을 피해를 무효로 하고 충전 1당 체력 1 회복 (5분에 한 번)
            case NEMO -> {
                if (amount >= target.getHealth() && now >= td.resuscitateReadyAt) {
                    td.resuscitateReadyAt = now + 6000;
                    float heal = Math.max(4.0F, td.charge * 1.0F);
                    td.charge = 0;
                    td.chargeSpentAt = now;
                    target.heal(heal);
                    level.sendParticles(ParticleTypes.ELECTRIC_SPARK, target.getX(), target.getY() + 1, target.getZ(), 40, 0.5, 0.8, 0.5, 0.2);
                    level.playSound(null, target.getX(), target.getY(), target.getZ(), SoundEvents.TOTEM_USE, SoundSource.PLAYERS, 0.6F, 1.5F);
                    if (target instanceof Player pl) {
                        pl.displayClientMessage(Component.translatable("message.fixercity.resuscitated").withStyle(ChatFormatting.AQUA, ChatFormatting.BOLD), true);
                    }
                    return 0.0F;
                }
            }
            default -> {
            }
        }
        return amount;
    }

    /** 흐트러졌을 때: 샤오의 들불, 야에의 즉시 수리. */
    public static void onStaggered(ServerLevel level, LivingEntity target) {
        KeyPagePassive p = passive(target);
        if (p == KeyPagePassive.XIAO && target instanceof Player player) {
            for (LivingEntity e : level.getEntitiesOfClass(LivingEntity.class, target.getBoundingBox().inflate(6.0),
                    e -> e != target && e.isAlive() && !(e instanceof Player))) {
                e.igniteForSeconds(6.0F);
                e.invulnerableTime = 0;
                e.hurt(player.damageSources().inFire(), 4.0F);
            }
            level.sendParticles(ParticleTypes.FLAME, target.getX(), target.getY() + 1, target.getZ(), 80, 2.5, 0.5, 2.5, 0.05);
            player.displayClientMessage(Component.translatable("message.fixercity.wildfire").withStyle(ChatFormatting.GOLD), true);
        }
        if (p == KeyPagePassive.YAE && target instanceof Player player) {
            CombatData d = player.getData(ModAttachments.COMBAT);
            if (!d.repairUsed) {
                d.repairUsed = true;
                long now = level.getGameTime();
                d.clearStagger(now, CombatHandler.staggerMax(player));
                player.removeEffect(MobEffects.MOVEMENT_SLOWDOWN);
                player.removeEffect(MobEffects.WEAKNESS);
                player.displayClientMessage(Component.translatable("message.fixercity.repaired").withStyle(ChatFormatting.AQUA, ChatFormatting.BOLD), true);
            }
        }
    }

    /** 보라색 눈물: 자세에 따라 공격 유형이 바뀐다 (0 참격, 1 관통, 2 타격, 3 수비). */
    public static DamageKind stanceKind(LivingEntity attacker) {
        if (attacker != null && has(attacker, KeyPagePassive.PURPLE_TEAR)
                && attacker.getMainHandItem().is(ModItems.PURPLE_TEAR_SWORD.get())) {
            int s = attacker.getData(ModAttachments.COMBAT).stance;
            if (s >= 0 && s < 3) {
                return DamageKind.values()[s];
            }
        }
        return null;
    }

    /** 처치하면 감정 +4. */
    @SubscribeEvent
    public static void onDeath(LivingDeathEvent event) {
        if (event.getSource().getEntity() instanceof Player player) {
            addEmotion(player, 4);
        }
        // 죽으면 목숨당 한 번 쓰는 것들 초기화
        if (event.getEntity() instanceof Player player) {
            CombatData d = player.getData(ModAttachments.COMBAT);
            d.egoUsed = false;
            d.egoUntil = 0;
            d.repairUsed = false;
            d.emotion = 0;
            d.emotionPoints = 0;
            d.charge = 0;
            d.smoke = 0;
        }
    }

    // ---------------------------------------------------------------- 유틸

    private static void effect(Player player, Holder<MobEffect> effect, int amp) {
        MobEffectInstance cur = player.getEffect(effect);
        if (cur == null || cur.getAmplifier() < amp || (cur.getAmplifier() == amp && cur.getDuration() < 30)) {
            player.addEffect(new MobEffectInstance(effect, 50, amp, true, false, true));
        }
    }

    private static int lostSteps(Player player, int max) {
        float lost = 1.0F - player.getHealth() / player.getMaxHealth();
        return Math.min(max, (int) (lost / 0.3F));
    }

    private static List<Player> nearbyAllies(Player player, double r) {
        return new java.util.ArrayList<>(player.level().getEntitiesOfClass(Player.class, player.getBoundingBox().inflate(r),
                a -> a != player && a.isAlive() && !a.isSpectator()));
    }

    private static List<Player> alliesAndSelf(Player player, double r) {
        List<Player> list = nearbyAllies(player, r);
        list.add(player);
        return list;
    }

    private static void give(Player player, ItemStack stack) {
        if (!player.getInventory().add(stack)) {
            player.drop(stack, false);
        }
    }
}
