package com.fixercity.item;

import com.fixercity.keypage.DamageKind;
import com.fixercity.keypage.KeyPage;
import com.fixercity.keypage.KeyPageHelper;
import com.fixercity.keypage.KeyPagePassive;
import com.fixercity.keypage.KeyPages;
import com.fixercity.registry.ModDataComponents;
import com.fixercity.registry.ModItems;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import net.minecraft.ChatFormatting;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Inventory;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.level.ClipContext;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.HitResult;
import net.minecraft.world.phys.Vec3;

/**
 * 총기 공통 클래스. 즉발(히트스캔) 사격, 탄창, 탄환 소모.
 * 우클릭 = 사격, 웅크리고 우클릭 또는 빈 탄창으로 우클릭 = 재장전.
 */
public abstract class GunItem extends Item implements HasDamageKind {
    private final int capacity;
    private final float damage;
    private final double range;
    private final int shotCooldown;
    private final int reloadCooldown;
    private final int maxPierce;
    private final float soundPitch;
    private final String resonancePage;

    protected GunItem(Properties properties, int capacity, float damage, double range, int shotCooldown,
            int reloadCooldown, int maxPierce, float soundPitch, String resonancePage) {
        super(properties);
        this.capacity = capacity;
        this.damage = damage;
        this.range = range;
        this.shotCooldown = shotCooldown;
        this.reloadCooldown = reloadCooldown;
        this.maxPierce = maxPierce;
        this.soundPitch = soundPitch;
        this.resonancePage = resonancePage;
    }

    @Override
    public DamageKind damageKind() {
        return DamageKind.PIERCE;
    }

    public int capacity() {
        return capacity;
    }

    /** 맞힌 대상마다 호출 (피해를 준 뒤). 하위 클래스가 추가 효과를 넣는다. */
    protected void onHit(ServerLevel level, Player player, LivingEntity target, boolean resonant) {}

    public boolean isResonant(LivingEntity entity) {
        KeyPage page = KeyPageHelper.getPage(entity);
        return page != null && page.id().equals(resonancePage);
    }

    public static int getAmmo(ItemStack stack) {
        return stack.getOrDefault(ModDataComponents.AMMO.get(), 0);
    }

    private static void setAmmo(ItemStack stack, int ammo) {
        stack.set(ModDataComponents.AMMO.get(), ammo);
    }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        if (level instanceof ServerLevel serverLevel) {
            if (player.isShiftKeyDown() || getAmmo(stack) <= 0) {
                reload(serverLevel, player, stack);
            } else {
                shoot(serverLevel, player, stack, hand);
            }
        }
        return InteractionResultHolder.sidedSuccess(stack, level.isClientSide());
    }

    private void reload(ServerLevel level, Player player, ItemStack stack) {
        int ammo = getAmmo(stack);
        int needed = capacity - ammo;
        if (needed <= 0) {
            return;
        }
        int loaded = player.getAbilities().instabuild ? needed : takeBullets(player.getInventory(), needed);
        if (loaded <= 0) {
            player.displayClientMessage(Component.translatable("message.fixercity.no_bullets").withStyle(ChatFormatting.RED), true);
            level.playSound(null, player.getX(), player.getY(), player.getZ(), SoundEvents.DISPENSER_FAIL, SoundSource.PLAYERS, 0.8F, 1.2F);
            player.getCooldowns().addCooldown(this, 10);
            return;
        }
        setAmmo(stack, ammo + loaded);
        player.getCooldowns().addCooldown(this, reloadCooldown);
        player.displayClientMessage(Component.translatable("message.fixercity.reloaded", ammo + loaded, capacity), true);
        level.playSound(null, player.getX(), player.getY(), player.getZ(), SoundEvents.IRON_TRAPDOOR_CLOSE, SoundSource.PLAYERS, 0.7F, 1.6F);
    }

    /** 인벤토리에서 탄환을 최대 max개 꺼내고 실제 꺼낸 수를 돌려준다. */
    private static int takeBullets(Inventory inventory, int max) {
        int taken = 0;
        for (int i = 0; i < inventory.getContainerSize() && taken < max; i++) {
            ItemStack s = inventory.getItem(i);
            if (s.is(ModItems.FIXER_BULLET.get())) {
                int n = Math.min(s.getCount(), max - taken);
                s.shrink(n);
                taken += n;
            }
        }
        return taken;
    }

    private void shoot(ServerLevel level, Player player, ItemStack stack, InteractionHand hand) {
        // 엄지 책장 패시브: 30% 확률로 탄환을 쓰지 않는다
        boolean saved = KeyPageHelper.hasPassive(player, KeyPagePassive.MARKSMAN) && level.getRandom().nextFloat() < 0.3F;
        if (!saved) {
            setAmmo(stack, getAmmo(stack) - 1);
        }
        boolean resonant = isResonant(player);

        Vec3 eye = player.getEyePosition();
        Vec3 look = player.getViewVector(1.0F);
        Vec3 end = eye.add(look.scale(range));
        BlockHitResult blockHit = level.clip(new ClipContext(eye, end, ClipContext.Block.COLLIDER, ClipContext.Fluid.NONE, player));
        if (blockHit.getType() != HitResult.Type.MISS) {
            end = blockHit.getLocation();
        }

        // 탄도 위의 모든 개체를 가까운 순으로 찾아 maxPierce개까지 관통
        record Hit(Entity entity, Vec3 pos, double dist) {}
        List<Hit> hits = new ArrayList<>();
        AABB searchBox = new AABB(eye, end).inflate(1.0);
        for (Entity e : level.getEntities(player, searchBox, e -> !e.isSpectator() && e.isPickable())) {
            AABB box = e.getBoundingBox().inflate(e.getPickRadius() + 0.1);
            Optional<Vec3> hitPos = box.contains(eye) ? Optional.of(eye) : box.clip(eye, end);
            hitPos.ifPresent(pos -> hits.add(new Hit(e, pos, pos.distanceToSqr(eye))));
        }
        hits.sort(Comparator.comparingDouble(Hit::dist));

        Vec3 lastPoint = end;
        int pierced = 0;
        for (Hit hit : hits) {
            if (pierced >= maxPierce) {
                break;
            }
            if (hit.entity() instanceof LivingEntity living && living.isAlliedTo(player)) {
                continue;
            }
            hit.entity().invulnerableTime = 0;
            hit.entity().hurt(player.damageSources().playerAttack(player), damage);
            if (hit.entity() instanceof LivingEntity living) {
                onHit(level, player, living, resonant);
            }
            level.sendParticles(ParticleTypes.CRIT, hit.pos().x, hit.pos().y, hit.pos().z, 8, 0.1, 0.1, 0.1, 0.2);
            pierced++;
            if (pierced >= maxPierce) {
                lastPoint = hit.pos();
            }
        }

        Vec3 path = lastPoint.subtract(eye);
        int steps = (int) Math.max(1, path.length() * 2);
        for (int i = 2; i <= steps; i++) {
            Vec3 p = eye.add(path.scale(i / (double) steps));
            level.sendParticles(ParticleTypes.SMOKE, p.x, p.y, p.z, 1, 0, 0, 0, 0);
        }
        Vec3 muzzle = eye.add(look.scale(0.8));
        level.sendParticles(ParticleTypes.FLAME, muzzle.x, muzzle.y - 0.1, muzzle.z, 3, 0.02, 0.02, 0.02, 0.01);
        level.playSound(null, player.getX(), player.getY(), player.getZ(), SoundEvents.FIREWORK_ROCKET_BLAST, SoundSource.PLAYERS, 1.5F, soundPitch);
        player.getCooldowns().addCooldown(this, shotCooldown);
        stack.hurtAndBreak(1, player, hand == InteractionHand.MAIN_HAND ? EquipmentSlot.MAINHAND : EquipmentSlot.OFFHAND);
    }

    @Override
    public void appendHoverText(ItemStack stack, TooltipContext context, List<Component> tooltip, TooltipFlag flag) {
        tooltip.add(Component.translatable(damageKind().translationKey()).withStyle(damageKind().color()));
        tooltip.add(Component.translatable("tooltip.fixercity.ammo", getAmmo(stack), capacity).withStyle(ChatFormatting.YELLOW));
        tooltip.add(Component.translatable("tooltip.fixercity.gun_stats", (int) damage, (int) range,
                String.format("%.1f", shotCooldown / 20.0F)).withStyle(ChatFormatting.DARK_GRAY));
        tooltip.add(Component.translatable(getDescriptionId() + ".lore").withStyle(ChatFormatting.GRAY, ChatFormatting.ITALIC));
        tooltip.add(Component.translatable(getDescriptionId() + ".ability").withStyle(ChatFormatting.GOLD));
        KeyPage page = KeyPages.byId(resonancePage);
        if (page != null) {
            tooltip.add(Component.translatable("tooltip.fixercity.resonance_page",
                    Component.translatable(page.translationKey())).withStyle(ChatFormatting.DARK_AQUA));
            tooltip.add(Component.literal("  ").append(Component.translatable(getDescriptionId() + ".resonance"))
                    .withStyle(ChatFormatting.AQUA));
        }
        super.appendHoverText(stack, context, tooltip, flag);
    }
}
