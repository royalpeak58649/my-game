package com.fixercity.keypage;

import com.fixercity.FixerCity;
import com.fixercity.network.KeyPageSyncPayload;
import com.fixercity.registry.ModAttachments;
import com.fixercity.registry.ModItems;
import net.minecraft.core.Holder;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.Attribute;
import net.minecraft.world.entity.ai.attributes.AttributeInstance;
import net.minecraft.world.entity.ai.attributes.AttributeModifier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.neoforged.neoforge.network.PacketDistributor;

/** 책장 장착/해제, 능력치 적용, 클라이언트 동기화. */
public final class KeyPageHelper {
    private static final ResourceLocation HEALTH_ID = FixerCity.id("key_page_health");
    private static final ResourceLocation SPEED_ID = FixerCity.id("key_page_speed");
    private static final ResourceLocation ARMOR_ID = FixerCity.id("key_page_armor");

    private KeyPageHelper() {}

    /** 생물이 낀 책장. 플레이어가 아니거나 없으면 null. */
    public static KeyPage getPage(LivingEntity entity) {
        if (!(entity instanceof Player)) {
            return null;
        }
        return KeyPages.byId(entity.getData(ModAttachments.KEY_PAGE));
    }

    public static boolean hasPassive(LivingEntity entity, KeyPagePassive passive) {
        KeyPage page = getPage(entity);
        return page != null && page.passive() == passive;
    }

    /** 책장을 낀다. 이전 책장은 인벤토리로 돌려준다. */
    public static void equip(ServerPlayer player, KeyPage page) {
        ItemStack old = takeOff(player);
        player.setData(ModAttachments.KEY_PAGE, page.id());
        refresh(player);
        if (!old.isEmpty() && !player.getInventory().add(old)) {
            player.drop(old, false);
        }
    }

    /** 책장을 벗기고 그 책장 아이템을 돌려준다 (없으면 빈 스택). 능력치/동기화도 갱신. */
    public static ItemStack unequip(ServerPlayer player) {
        ItemStack old = takeOff(player);
        refresh(player);
        return old;
    }

    private static ItemStack takeOff(ServerPlayer player) {
        KeyPage current = getPage(player);
        player.setData(ModAttachments.KEY_PAGE, "");
        return current == null ? ItemStack.EMPTY : new ItemStack(ModItems.keyPageItem(current));
    }

    /** 능력치 다시 계산 + 주변에 옷 동기화. 접속/리스폰/차원 이동 때도 부른다. */
    public static void refresh(ServerPlayer player) {
        applyAttributes(player);
        sync(player);
    }

    public static void applyAttributes(Player player) {
        KeyPage page = getPage(player);
        set(player, Attributes.MAX_HEALTH, HEALTH_ID, page == null ? 0 : page.health(), AttributeModifier.Operation.ADD_VALUE);
        set(player, Attributes.MOVEMENT_SPEED, SPEED_ID, page == null ? 0 : page.speed(), AttributeModifier.Operation.ADD_MULTIPLIED_BASE);
        set(player, Attributes.ARMOR, ARMOR_ID, page == null ? 0 : page.armor(), AttributeModifier.Operation.ADD_VALUE);
        com.fixercity.accessory.AccessoryHelper.applyAttributes(player);
        if (player.getHealth() > player.getMaxHealth()) {
            player.setHealth(player.getMaxHealth());
        }
    }

    private static void set(Player player, Holder<Attribute> attribute, ResourceLocation id, double amount,
            AttributeModifier.Operation operation) {
        AttributeInstance instance = player.getAttribute(attribute);
        if (instance == null) {
            return;
        }
        instance.removeModifier(id);
        if (amount != 0) {
            instance.addTransientModifier(new AttributeModifier(id, amount, operation));
        }
    }

    /** 이 플레이어의 책장 상태를 본인과 이 플레이어를 보는 모든 클라이언트에 보낸다. */
    public static void sync(ServerPlayer player) {
        PacketDistributor.sendToPlayersTrackingEntityAndSelf(player,
                new KeyPageSyncPayload(player.getId(), player.getData(ModAttachments.KEY_PAGE)));
    }

    /** 특정 클라이언트에게 대상 플레이어의 책장 상태를 보낸다 (추적 시작 시). */
    public static void syncTo(ServerPlayer receiver, Player target) {
        PacketDistributor.sendToPlayer(receiver, new KeyPageSyncPayload(target.getId(), target.getData(ModAttachments.KEY_PAGE)));
    }
}
