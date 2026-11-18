package com.fixercity.request;

import com.fixercity.kit.FixerKit;

import com.fixercity.accessory.Accessory;
import com.fixercity.keypage.KeyPages;
import com.fixercity.registry.ModItems;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Supplier;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.MutableComponent;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.item.ItemStack;

/** 협회 상점. 등급 이상이면 안(돈)으로 산다. 게시판 근처에서만. */
public final class Shop {
    public record Entry(String id, String category, Supplier<ItemStack> stack, int price, int minGrade) {}

    public static final List<String> CATEGORIES = List.of("supplies", "pages", "weapons", "accessories", "invitations", "sell");
    private static final List<Entry> ENTRIES = new ArrayList<>();

    static {
        add("bullets", "supplies", () -> new ItemStack(ModItems.FIXER_BULLET.get(), 8), 40, 9);
        add("first_aid_kit", "supplies", () -> new ItemStack(ModItems.FIRST_AID_KIT.get()), 60, 9);
        add("painkiller", "supplies", () -> new ItemStack(ModItems.PAINKILLER.get()), 50, 9);
        add("flashbang", "supplies", () -> new ItemStack(ModItems.FLASHBANG.get()), 80, 8);
        add("smoke_bomb", "supplies", () -> new ItemStack(ModItems.SMOKE_BOMB.get()), 80, 8);
        add("city_pass", "supplies", () -> new ItemStack(ModItems.CITY_PASS.get()), 100, 9);
        add("blank_key_page", "supplies", () -> new ItemStack(ModItems.BLANK_KEY_PAGE.get()), 50, 9);

        add("page_rat", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.RAT)), 60, 9);
        add("page_office_fixer", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.OFFICE_FIXER)), 200, 8);
        add("page_zwei", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.ZWEI)), 1500, 6);
        add("page_shi", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.SHI)), 4000, 4);
        add("page_liu", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.LIU)), 6000, 3);
        add("page_seven", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.SEVEN)), 4000, 4);
        add("page_thumb", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.THUMB)), 6000, 3);
        add("page_kurokumo", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.KUROKUMO)), 2500, 5);

        add("page_yun", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.YUN)), 300, 8);
        add("page_hook", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.HOOK)), 300, 8);
        add("page_streetlight", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.STREETLIGHT)), 700, 7);
        add("page_molar", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.MOLAR)), 1500, 6);
        add("page_full_stop", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.FULL_STOP)), 2500, 5);
        add("page_dawn", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.DAWN)), 2500, 5);
        add("page_gaze", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.GAZE)), 2500, 5);
        add("page_wedge", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.WEDGE)), 2500, 5);
        add("page_workshop", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.WORKSHOP)), 2500, 5);
        add("page_jeong", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.JEONG)), 2500, 5);

        add("page_w_corp", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.W_CORP)), 4000, 4);
        add("page_warp", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.WARP)), 4000, 4);
        add("page_smiling", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.SMILING)), 4000, 4);
        add("page_index", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.INDEX)), 4000, 4);
        add("page_philip", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.PHILIP)), 4000, 4);
        // ---- 도시의 별 · 하나 협회 ----
        add("page_dong_hwan", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.DONG_HWAN)), 12000, 1);
        add("page_lowell", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.LOWELL)), 8000, 2);
        add("page_cecil", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.CECIL)), 8000, 2);
        add("page_mei", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.MEI)), 8000, 2);
        add("page_kalo", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.KALO)), 8000, 2);
        add("page_boris", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.BORIS)), 8000, 2);
        add("page_katriel", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.KATRIEL)), 8000, 2);
        add("page_denis", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.DENIS)), 8000, 2);
        add("page_nemo", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.NEMO)), 8000, 2);
        add("page_martina", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.MARTINA)), 8000, 2);
        add("page_bada", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.BADA)), 8000, 2);
        add("page_esther", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.ESTHER)), 8000, 2);
        add("page_hubert", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.HUBERT)), 8000, 2);
        add("page_gloria", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.GLORIA)), 8000, 2);
        add("page_chun", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.CHUN)), 8000, 2);
        add("page_xiao", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.XIAO)), 12000, 1);
        add("page_miris", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.MIRIS)), 8000, 2);
        add("page_red_mist", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.RED_MIST)), 20000, 1);
        add("page_nikolai", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.NIKOLAI)), 12000, 1);
        add("page_myo", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.MYO)), 8000, 2);
        add("page_maxim", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.MAXIM)), 8000, 2);
        add("page_rudolph", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.RUDOLPH)), 8000, 2);
        add("page_purple_tear", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.PURPLE_TEAR)), 20000, 1);
        add("page_yan", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.YAN)), 12000, 1);
        add("page_allen", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.ALLEN)), 12000, 1);
        add("page_irina", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.IRINA)), 12000, 1);
        add("page_yae", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.YAE)), 12000, 1);
        add("page_bayard", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.BAYARD)), 12000, 1);
        add("page_hana_fixer", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.HANA_FIXER)), 8000, 2);
        add("page_mirinae", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.MIRINAE)), 12000, 1);
        add("page_harold", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.HAROLD)), 12000, 1);
        add("page_olivier", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.OLIVIER)), 12000, 1);
        add("cane_office_cane", "weapons", () -> new ItemStack(ModItems.CANE_OFFICE_CANE.get()), 7000, 2);
        add("proxy_blade", "weapons", () -> new ItemStack(ModItems.PROXY_BLADE.get()), 7000, 2);
        add("liu_fire_sword", "weapons", () -> new ItemStack(ModItems.LIU_FIRE_SWORD.get()), 7000, 2);
        add("r_corp_rifle", "weapons", () -> new ItemStack(ModItems.R_CORP_RIFLE.get()), 7000, 2);
        add("rhino_gauntlet", "weapons", () -> new ItemStack(ModItems.RHINO_GAUNTLET.get()), 7000, 2);
        add("reindeer_staff", "weapons", () -> new ItemStack(ModItems.REINDEER_STAFF.get()), 7000, 2);
        add("red_mist_blade", "weapons", () -> new ItemStack(ModItems.RED_MIST_BLADE.get()), 12000, 1);
        add("purple_tear_sword", "weapons", () -> new ItemStack(ModItems.PURPLE_TEAR_SWORD.get()), 12000, 1);
        add("yan_blade", "weapons", () -> new ItemStack(ModItems.YAN_BLADE.get()), 7000, 1);
        add("allen_stiletto", "weapons", () -> new ItemStack(ModItems.ALLEN_STILETTO.get()), 7000, 1);
        add("smoke_gear_blade", "weapons", () -> new ItemStack(ModItems.SMOKE_GEAR_BLADE.get()), 7000, 1);
        add("hana_sword", "weapons", () -> new ItemStack(ModItems.HANA_SWORD.get()), 7000, 2);
        add("w_corp_baton", "weapons", () -> new ItemStack(ModItems.W_CORP_BATON.get()), 3000, 4);
        add("warp_blade", "weapons", () -> new ItemStack(ModItems.WARP_BLADE.get()), 3000, 4);
        add("smiling_maw", "weapons", () -> new ItemStack(ModItems.SMILING_MAW.get()), 3000, 4);
        add("index_blade", "weapons", () -> new ItemStack(ModItems.INDEX_BLADE.get()), 3000, 4);
        add("philip_sword", "weapons", () -> new ItemStack(ModItems.PHILIP_SWORD.get()), 3000, 4);
        add("yun_machete", "weapons", () -> new ItemStack(ModItems.YUN_MACHETE.get()), 400, 8);
        add("hook_blade", "weapons", () -> new ItemStack(ModItems.HOOK_BLADE.get()), 400, 8);
        add("streetlight_staff", "weapons", () -> new ItemStack(ModItems.STREETLIGHT_STAFF.get()), 700, 7);
        add("molar_hammer", "weapons", () -> new ItemStack(ModItems.MOLAR_HAMMER.get()), 1200, 6);
        add("full_stop_rifle", "weapons", () -> new ItemStack(ModItems.FULL_STOP_RIFLE.get()), 1800, 5);
        add("dawn_sword", "weapons", () -> new ItemStack(ModItems.DAWN_SWORD.get()), 1800, 5);
        add("gaze_rapier", "weapons", () -> new ItemStack(ModItems.GAZE_RAPIER.get()), 1800, 5);
        add("wedge_spear", "weapons", () -> new ItemStack(ModItems.WEDGE_SPEAR.get()), 1800, 5);
        add("workshop_halberd", "weapons", () -> new ItemStack(ModItems.WORKSHOP_HALBERD.get()), 1800, 5);
        add("jeong_twin_blades", "weapons", () -> new ItemStack(ModItems.JEONG_TWIN_BLADES.get()), 1800, 5);
        // 초급 무기 (9급부터)
        add("rusty_pipe", "weapons", () -> new ItemStack(ModItems.RUSTY_PIPE.get()), 40, 9);
        add("fixer_dagger", "weapons", () -> new ItemStack(ModItems.FIXER_DAGGER.get()), 100, 9);
        add("fixer_longsword", "weapons", () -> new ItemStack(ModItems.FIXER_LONGSWORD.get()), 150, 9);
        add("fixer_mace", "weapons", () -> new ItemStack(ModItems.FIXER_MACE.get()), 150, 9);
        add("revolver", "weapons", () -> new ItemStack(ModItems.FIXER_REVOLVER.get()), 300, 9);
        add("zwei_greatsword", "weapons", () -> new ItemStack(ModItems.ZWEI_GREATSWORD.get()), 1200, 6);
        add("shi_blade", "weapons", () -> new ItemStack(ModItems.SHI_BLADE.get()), 3000, 4);
        add("liu_gauntlet", "weapons", () -> new ItemStack(ModItems.LIU_GAUNTLET.get()), 4500, 3);
        add("seven_cane", "weapons", () -> new ItemStack(ModItems.SEVEN_CANE.get()), 3000, 4);
        add("thumb_rifle", "weapons", () -> new ItemStack(ModItems.THUMB_RIFLE.get()), 4500, 3);
        add("kurokumo_blade", "weapons", () -> new ItemStack(ModItems.KUROKUMO_BLADE.get()), 1500, 5);

        // 초대장: 손님(보스 모드)이 있을 때만 판다
        if (com.fixercity.reception.Guest.bossModLoaded()) {
            for (com.fixercity.reception.Guest guest : com.fixercity.reception.Guest.values()) {
                add("invitation_" + guest.id(), "invitations", () -> ModItems.invitation(guest),
                        Grades.baseAhn(guest.grade()) * 2, Math.min(9, guest.grade() + 1));
            }
        }
        add("lucky_coin", "accessories", () -> new ItemStack(ModItems.accessoryItem(Accessory.LUCKY_COIN)), 150, 9);
        add("office_badge", "accessories", () -> new ItemStack(ModItems.accessoryItem(Accessory.OFFICE_BADGE)), 300, 8);
        add("zwei_armband", "accessories", () -> new ItemStack(ModItems.accessoryItem(Accessory.ZWEI_ARMBAND)), 900, 6);
        add("shi_tassel", "accessories", () -> new ItemStack(ModItems.accessoryItem(Accessory.SHI_TASSEL)), 2500, 4);
        add("liu_talisman", "accessories", () -> new ItemStack(ModItems.accessoryItem(Accessory.LIU_TALISMAN)), 3500, 3);
        add("seven_monocle", "accessories", () -> new ItemStack(ModItems.accessoryItem(Accessory.SEVEN_MONOCLE)), 2500, 4);
        add("thumb_bandolier", "accessories", () -> new ItemStack(ModItems.accessoryItem(Accessory.THUMB_BANDOLIER)), 3500, 3);
        add("kurokumo_knot", "accessories", () -> new ItemStack(ModItems.accessoryItem(Accessory.KUROKUMO_KNOT)), 1400, 5);
    }

    private Shop() {}

    private static void add(String id, String category, Supplier<ItemStack> stack, int price, int minGrade) {
        ENTRIES.add(new Entry(id, category, stack, price, minGrade));
    }

    /** 접대 보상 후보: 그 등급 근처(같거나 3단계 아래까지)의 책장·무기·장신구. */
    public static List<ItemStack> rewardPool(int grade) {
        List<ItemStack> list = new ArrayList<>();
        for (Entry e : ENTRIES) {
            boolean gear = e.category().equals("pages") || e.category().equals("weapons") || e.category().equals("accessories");
            if (gear && e.minGrade() >= grade && e.minGrade() <= grade + 3) {
                list.add(e.stack().get());
            }
        }
        if (list.isEmpty()) {
            for (Entry e : ENTRIES) {
                if (e.category().equals("pages") || e.category().equals("weapons")) {
                    list.add(e.stack().get());
                }
            }
        }
        return list;
    }

    /** 공방 특가 이벤트 중이면 30% 할인. */
    public static int price(ServerPlayer player, Entry e) {
        return Math.round(e.price() * com.fixercity.event.CityEvents.priceMultiplier(player.server));
    }

    public static Entry find(String id) {
        for (Entry e : ENTRIES) {
            if (e.id().equals(id)) {
                return e;
            }
        }
        return null;
    }

    public static void showCategories(ServerPlayer player) {
        player.sendSystemMessage(Component.translatable("ui.fixercity.shop_header").withStyle(ChatFormatting.AQUA, ChatFormatting.BOLD));
        player.sendSystemMessage(RequestUi.profileLine(player.server, player));
        MutableComponent line = Component.literal(" ");
        for (String c : CATEGORIES) {
            line.append(RequestUi.button("shop.fixercity.category." + c, "/shop " + c, ChatFormatting.AQUA,
                    Component.translatable("shop.fixercity.category." + c))).append(" ");
        }
        player.sendSystemMessage(line);
    }

    public static void showCategory(ServerPlayer player, String category) {
        if (category.equals("sell")) {
            LootSale.show(player);
            return;
        }
        int g = RequestManager.grade(player.server, player.getUUID());
        player.sendSystemMessage(Component.translatable("ui.fixercity.shop_header").withStyle(ChatFormatting.AQUA, ChatFormatting.BOLD)
                .append(Component.literal(" - ")).append(Component.translatable("shop.fixercity.category." + category)));
        for (Entry e : ENTRIES) {
            if (!e.category().equals(category)) {
                continue;
            }
            ItemStack stack = displayStack(e);
            boolean allowed = g <= e.minGrade();
            MutableComponent line = Component.literal(" ");
            if (allowed) {
                line.append(RequestUi.button("ui.fixercity.buy", "/shop buy " + e.id(), ChatFormatting.GREEN,
                        Component.translatable("ui.fixercity.buy_hover", stack.getHoverName(), String.format("%,d", price(player, e)))));
            } else {
                line.append(Component.literal("[ - ]").withStyle(ChatFormatting.DARK_GRAY));
            }
            line.append(" ").append(stack.getHoverName().copy().withStyle(ChatFormatting.WHITE));
            if (stack.getCount() > 1) {
                line.append(Component.literal(" x" + stack.getCount()).withStyle(ChatFormatting.GRAY));
            }
            line.append(Component.literal(" · " + String.format("%,d", price(player, e)) + "안").withStyle(ChatFormatting.YELLOW));
            line.append(Component.literal(" (" + e.minGrade() + "급~)").withStyle(allowed ? ChatFormatting.DARK_GRAY : ChatFormatting.RED));
            player.sendSystemMessage(line);
        }
    }

    /** 책장 탭은 그 조직의 키트를 판다. 아이콘은 책장, 이름은 키트. */
    private static FixerKit kitFor(ItemStack stack) {
        return stack.getItem() instanceof com.fixercity.item.KeyPageItem pageItem ? FixerKit.forPage(pageItem.page().id()) : null;
    }

    private static ItemStack displayStack(Entry e) {
        ItemStack stack = e.stack().get();
        if (e.category().equals("pages")) {
            FixerKit kit = kitFor(stack);
            if (kit != null) {
                stack.set(net.minecraft.core.component.DataComponents.CUSTOM_NAME,
                        Component.translatable("ui.fixercity.shop_kit", Component.translatable("kit.fixercity." + kit.id()))
                                .withStyle(s -> s.withItalic(false).withColor(ChatFormatting.GOLD)));
                stack.set(net.minecraft.core.component.DataComponents.LORE, new net.minecraft.world.item.component.ItemLore(
                        List.of(Component.translatable("kit.fixercity." + kit.id() + ".desc")
                                .withStyle(s -> s.withItalic(false).withColor(ChatFormatting.GRAY)))));
            }
        }
        return stack;
    }

    /** GUI 화면용 상점 데이터. */
    public static void sendShop(ServerPlayer player, String category) {
        int g = RequestManager.grade(player.server, player.getUUID());
        List<com.fixercity.network.ShopPayload.Entry> list = new ArrayList<>();
        if (category.equals("sell")) {
            list.addAll(LootSale.entries(player));
        }
        for (Entry e : ENTRIES) {
            if (e.category().equals(category)) {
                list.add(new com.fixercity.network.ShopPayload.Entry(e.id(), displayStack(e), price(player, e), e.minGrade(), g <= e.minGrade()));
            }
        }
        net.neoforged.neoforge.network.PacketDistributor.sendToPlayer(player,
                new com.fixercity.network.ShopPayload(RequestUi.profileLine(player.server, player), category, list));
    }

    public static boolean buy(ServerPlayer player, String id) {
        Entry e = find(id);
        if (e == null) {
            return false;
        }
        if (!RequestManager.nearBoard(player)) {
            player.sendSystemMessage(Component.translatable("message.fixercity.need_board").withStyle(ChatFormatting.RED));
            return false;
        }
        FixerSavedData data = RequestManager.data(player.server);
        FixerSavedData.Profile p = data.profile(player.getUUID());
        if (Grades.gradeFor(p.rep) > e.minGrade()) {
            player.sendSystemMessage(Component.translatable("message.fixercity.grade_too_low", e.minGrade()).withStyle(ChatFormatting.RED));
            return false;
        }
        int price = price(player, e);
        if (p.ahn < price) {
            player.sendSystemMessage(Component.translatable("message.fixercity.not_enough_ahn", String.format("%,d", price))
                    .withStyle(ChatFormatting.RED));
            return false;
        }
        p.ahn -= price;
        data.setDirty();
        ItemStack stack = e.stack().get();
        Component name = stack.getHoverName();
        // 책장 탭: 그 조직의 키트를 키트 보관함에 넣는다 (죽어도 안 잃고, 여러 개 모아 둘 수 있다)
        FixerKit kit = e.category().equals("pages") ? kitFor(stack) : null;
        if (kit != null) {
            p.storedKits.add(com.fixercity.event.FixerEvents.BOUGHT_PREFIX + kit.id());
            data.setDirty();
            player.sendSystemMessage(Component.translatable("message.fixercity.bought_page",
                    Component.translatable("kit.fixercity." + kit.id()), String.format("%,d", price),
                    String.format("%,d", p.ahn)).withStyle(ChatFormatting.GREEN));
            return true;
        }
        if (!player.getInventory().add(stack)) {
            player.drop(stack, false);
        }
        player.sendSystemMessage(Component.translatable("message.fixercity.bought", name, String.format("%,d", price),
                String.format("%,d", p.ahn)).withStyle(ChatFormatting.GREEN));
        return true;
    }
}
