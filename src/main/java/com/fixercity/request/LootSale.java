package com.fixercity.request;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import net.minecraft.ChatFormatting;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;

/** 몬스터 전리품 판매: 게시판 근처에서 협회 상점에 판다 (개당 안). */
public final class LootSale {
    private LootSale() {}

    public static final Map<Item, Integer> PRICES = new LinkedHashMap<>();

    static {
        PRICES.put(Items.ROTTEN_FLESH, 1);
        PRICES.put(Items.BONE, 2);
        PRICES.put(Items.ARROW, 1);
        PRICES.put(Items.STRING, 2);
        PRICES.put(Items.SPIDER_EYE, 3);
        PRICES.put(Items.GUNPOWDER, 4);
        PRICES.put(Items.ENDER_PEARL, 20);
        PRICES.put(Items.PHANTOM_MEMBRANE, 10);
        PRICES.put(Items.SLIME_BALL, 4);
        PRICES.put(Items.IRON_INGOT, 6);
        PRICES.put(Items.COPPER_INGOT, 2);
        PRICES.put(Items.GLASS_BOTTLE, 1);
        PRICES.put(Items.REDSTONE, 1);
        PRICES.put(Items.GLOWSTONE_DUST, 1);
        PRICES.put(Items.SUGAR, 1);
        PRICES.put(Items.EMERALD, 12);
        PRICES.put(Items.CROSSBOW, 6);
        PRICES.put(Items.IRON_AXE, 6);
        PRICES.put(Items.TOTEM_OF_UNDYING, 250);
    }

    public static String id(Item item) {
        return BuiltInRegistries.ITEM.getKey(item).getPath();
    }

    public static Item byId(String id) {
        for (Item item : PRICES.keySet()) {
            if (id(item).equals(id)) {
                return item;
            }
        }
        return null;
    }

    public static int count(ServerPlayer player, Item item) {
        int n = 0;
        for (ItemStack s : player.getInventory().items) {
            if (s.is(item)) {
                n += s.getCount();
            }
        }
        return n;
    }

    /** 인벤토리(핫바 포함, 갑옷·보조손 제외)에서 그 아이템을 모두 판다. 판 개수. */
    private static int take(ServerPlayer player, Item item) {
        int n = 0;
        for (ItemStack s : player.getInventory().items) {
            if (s.is(item)) {
                n += s.getCount();
                s.setCount(0);
            }
        }
        return n;
    }

    /** id = 아이템 이름 또는 "all". */
    public static boolean sell(ServerPlayer player, String id) {
        if (!RequestManager.nearBoard(player)) {
            player.sendSystemMessage(Component.translatable("message.fixercity.need_board").withStyle(ChatFormatting.RED));
            return false;
        }
        List<Item> items = new ArrayList<>();
        if (id.equals("all")) {
            items.addAll(PRICES.keySet());
        } else {
            Item item = byId(id);
            if (item == null) {
                player.sendSystemMessage(Component.translatable("message.fixercity.not_sellable").withStyle(ChatFormatting.RED));
                return false;
            }
            items.add(item);
        }
        int total = 0;
        int sold = 0;
        for (Item item : items) {
            int n = take(player, item);
            sold += n;
            total += n * PRICES.get(item);
        }
        if (sold == 0) {
            player.sendSystemMessage(Component.translatable("message.fixercity.nothing_to_sell").withStyle(ChatFormatting.GRAY));
            return false;
        }
        RequestManager.addAhn(player.server, player.getUUID(), total);
        int balance = RequestManager.data(player.server).profile(player.getUUID()).ahn;
        player.sendSystemMessage(Component.translatable("message.fixercity.sold", sold, String.format("%,d", total),
                String.format("%,d", balance)).withStyle(ChatFormatting.GREEN));
        player.level().playSound(null, player.getX(), player.getY(), player.getZ(), SoundEvents.VILLAGER_YES, SoundSource.PLAYERS, 0.6F, 1.2F);
        return true;
    }

    /** GUI용 목록. minGrade 칸에 보유 개수를 담는다. */
    public static List<com.fixercity.network.ShopPayload.Entry> entries(ServerPlayer player) {
        List<com.fixercity.network.ShopPayload.Entry> list = new ArrayList<>();
        for (Map.Entry<Item, Integer> e : PRICES.entrySet()) {
            int n = count(player, e.getKey());
            list.add(new com.fixercity.network.ShopPayload.Entry(id(e.getKey()), new ItemStack(e.getKey()), e.getValue(), n, n > 0));
        }
        list.sort((a, b) -> Boolean.compare(b.allowed(), a.allowed()));
        return list;
    }

    /** 채팅 목록. */
    public static void show(ServerPlayer player) {
        player.sendSystemMessage(Component.translatable("ui.fixercity.shop_header").withStyle(ChatFormatting.AQUA, ChatFormatting.BOLD)
                .append(Component.literal(" - ")).append(Component.translatable("shop.fixercity.category.sell")));
        int value = 0;
        for (Map.Entry<Item, Integer> e : PRICES.entrySet()) {
            int n = count(player, e.getKey());
            if (n == 0) {
                continue;
            }
            value += n * e.getValue();
            player.sendSystemMessage(Component.literal(" ")
                    .append(RequestUi.button("ui.fixercity.sell", "/shop sell " + id(e.getKey()), ChatFormatting.GREEN,
                            Component.translatable("ui.fixercity.sell_hover", e.getKey().getDescription(), String.format("%,d", n * e.getValue()))))
                    .append(" ").append(e.getKey().getDescription().copy().withStyle(ChatFormatting.WHITE))
                    .append(Component.literal(" x" + n).withStyle(ChatFormatting.GRAY))
                    .append(Component.literal(" · " + e.getValue() + "안").withStyle(ChatFormatting.YELLOW)));
        }
        if (value == 0) {
            player.sendSystemMessage(Component.translatable("message.fixercity.nothing_to_sell").withStyle(ChatFormatting.GRAY));
        } else {
            player.sendSystemMessage(Component.literal(" ").append(RequestUi.button("ui.fixercity.sell_all", "/shop sell all", ChatFormatting.GOLD,
                    Component.translatable("ui.fixercity.sell_hover", Component.translatable("ui.fixercity.everything"), String.format("%,d", value)))));
        }
    }
}
