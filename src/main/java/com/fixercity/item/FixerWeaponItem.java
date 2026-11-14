package com.fixercity.item;

import com.fixercity.keypage.KeyPage;
import com.fixercity.keypage.KeyPageHelper;
import com.fixercity.keypage.KeyPages;
import java.util.List;
import net.minecraft.ChatFormatting;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.SwordItem;
import net.minecraft.world.item.Tier;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.Vec3;

/**
 * 해결사 근접 무기 공통 클래스.
 * 주 손에 들고 우클릭하면 무기 고유 기술을 쓰고, 재사용 대기시간이 걸린다.
 * 무기와 맞는 책장을 끼고 있으면 <b>공명</b>: 대기시간 25% 감소 + 무기별 추가 효과.
 */
public abstract class FixerWeaponItem extends SwordItem implements HasDamageKind {
    public enum AbilityResult { FAILED, USED, USED_NO_COOLDOWN }

    private static final float RESONANCE_COOLDOWN = 0.75F;

    private final int cooldownTicks;
    private final String resonancePage;

    protected FixerWeaponItem(Tier tier, Properties properties, int cooldownTicks, String resonancePage) {
        super(tier, properties);
        this.cooldownTicks = cooldownTicks;
        this.resonancePage = resonancePage;
    }

    /** 서버에서만 호출. resonant = 맞는 책장을 끼고 있는지. */
    protected abstract AbilityResult performAbility(ServerLevel level, Player player, ItemStack stack, boolean resonant);

    public boolean isResonant(LivingEntity entity) {
        KeyPage page = KeyPageHelper.getPage(entity);
        return page != null && page.id().equals(resonancePage);
    }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        if (hand != InteractionHand.MAIN_HAND) {
            return InteractionResultHolder.pass(stack);
        }
        if (level instanceof ServerLevel serverLevel) {
            boolean resonant = isResonant(player);
            AbilityResult result = performAbility(serverLevel, player, stack, resonant);
            if (result != AbilityResult.FAILED) {
                if (result == AbilityResult.USED) {
                    int cd = resonant ? Math.round(cooldownTicks * RESONANCE_COOLDOWN) : cooldownTicks;
                    player.getCooldowns().addCooldown(this, cd);
                }
                stack.hurtAndBreak(1, player, EquipmentSlot.MAINHAND);
                if (resonant) {
                    serverLevel.sendParticles(ParticleTypes.END_ROD, player.getX(), player.getY() + 1.0, player.getZ(),
                            10, 0.4, 0.6, 0.4, 0.02);
                }
            }
        }
        return InteractionResultHolder.sidedSuccess(stack, level.isClientSide());
    }

    @Override
    public void appendHoverText(ItemStack stack, TooltipContext context, List<Component> tooltip, TooltipFlag flag) {
        tooltip.add(Component.translatable(damageKind().translationKey()).withStyle(damageKind().color()));
        tooltip.add(Component.translatable(getDescriptionId() + ".lore").withStyle(ChatFormatting.GRAY, ChatFormatting.ITALIC));
        tooltip.add(Component.translatable(getDescriptionId() + ".ability").withStyle(ChatFormatting.GOLD));
        tooltip.add(Component.translatable("tooltip.fixercity.cooldown", String.format("%.1f", cooldownTicks / 20.0F))
                .withStyle(ChatFormatting.DARK_GRAY));
        KeyPage page = KeyPages.byId(resonancePage);
        if (page != null) {
            tooltip.add(Component.translatable("tooltip.fixercity.resonance_page",
                    Component.translatable(page.translationKey())).withStyle(ChatFormatting.DARK_AQUA));
            tooltip.add(Component.literal("  ").append(Component.translatable(getDescriptionId() + ".resonance"))
                    .withStyle(ChatFormatting.AQUA));
        }
        super.appendHoverText(stack, context, tooltip, flag);
    }

    // ---- 공용 유틸 ----

    protected static float attackDamage(Player player) {
        return (float) player.getAttributeValue(net.minecraft.world.entity.ai.attributes.Attributes.ATTACK_DAMAGE);
    }

    /** 수평 시선 방향 (길이 1). 정면이 거의 수직이면 null. */
    protected static Vec3 flatLook(Player player) {
        Vec3 look = player.getLookAngle();
        Vec3 flat = new Vec3(look.x, 0, look.z);
        return flat.lengthSqr() < 1.0E-4 ? null : flat.normalize();
    }

    /** 대상이 플레이어 본인/아군/죽은 개체가 아닌지. */
    protected static boolean isValidTarget(Player player, LivingEntity target) {
        return target != player && target.isAlive() && !target.isAlliedTo(player) && !target.isSpectator();
    }

    /** 플레이어 앞 부채꼴(반경 range, cos 기준 minDot) 안의 적. */
    protected static List<LivingEntity> targetsInCone(ServerLevel level, Player player, double range, double minDot) {
        Vec3 eye = player.getEyePosition();
        Vec3 look = player.getLookAngle();
        return level.getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(range), t -> {
            if (!isValidTarget(player, t)) {
                return false;
            }
            Vec3 to = t.position().add(0, t.getBbHeight() * 0.5, 0).subtract(eye);
            double dist = to.length();
            return dist <= range + t.getBbWidth() * 0.5 && (dist < 1.0 || to.normalize().dot(look) >= minDot);
        });
    }

    /** 점 p에서 선분 a-b까지의 거리. */
    protected static double distanceToSegment(Vec3 p, Vec3 a, Vec3 b) {
        Vec3 ab = b.subtract(a);
        double lenSq = ab.lengthSqr();
        if (lenSq < 1.0E-6) {
            return p.distanceTo(a);
        }
        double t = Math.max(0, Math.min(1, p.subtract(a).dot(ab) / lenSq));
        return p.distanceTo(a.add(ab.scale(t)));
    }

    /** 앞으로 돌진하며 경로상의 적 목록을 돌려준다 (가까운 순). */
    protected static List<LivingEntity> dash(ServerLevel level, Player player, Vec3 dir, double distance, double speed, double radius) {
        Vec3 start = player.position().add(0, player.getBbHeight() * 0.5, 0);
        Vec3 end = start.add(dir.scale(distance));
        player.setDeltaMovement(dir.x * speed, 0.15, dir.z * speed);
        player.hurtMarked = true;
        List<LivingEntity> hits = new java.util.ArrayList<>(level.getEntitiesOfClass(LivingEntity.class,
                new net.minecraft.world.phys.AABB(start, end).inflate(radius), t -> isValidTarget(player, t)
                        && distanceToSegment(t.position().add(0, t.getBbHeight() * 0.5, 0), start, end) <= radius + t.getBbWidth() * 0.5));
        hits.sort(java.util.Comparator.comparingDouble(t -> t.distanceToSqr(player)));
        return hits;
    }

    /** 대상을 플레이어 반대쪽으로 밀어낸다. */
    protected static void pushAway(Player player, LivingEntity target, double strength) {
        target.knockback(strength, player.getX() - target.getX(), player.getZ() - target.getZ());
    }

    /** 연속 타격용: 무적 시간을 무시하고 피해. */
    protected static void strike(Player player, LivingEntity target, float damage) {
        target.invulnerableTime = 0;
        target.hurt(player.damageSources().playerAttack(player), damage);
    }
}
