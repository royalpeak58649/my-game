package com.fixercity.registry;

import com.fixercity.FixerCity;
import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.CreativeModeTab;
import net.neoforged.neoforge.registries.DeferredHolder;
import net.neoforged.neoforge.registries.DeferredRegister;

public final class ModCreativeTabs {
    public static final DeferredRegister<CreativeModeTab> REGISTER =
            DeferredRegister.create(Registries.CREATIVE_MODE_TAB, FixerCity.MODID);

    public static final DeferredHolder<CreativeModeTab, CreativeModeTab> FIXER_GEAR = REGISTER.register("fixer_gear",
            () -> CreativeModeTab.builder()
                    .title(Component.translatable("itemGroup.fixercity.fixer_gear"))
                    .icon(() -> ModItems.FIXER_LONGSWORD.get().getDefaultInstance())
                    .displayItems((params, output) -> {
                        output.accept(ModItems.REQUEST_BOARD.get());
                        output.accept(ModItems.WORKSHOP.get());
                        output.accept(ModItems.CITY_PASS.get());
                        for (com.fixercity.reception.LibraryFloor floor : com.fixercity.reception.LibraryFloor.values()) {
                            output.accept(ModItems.invitation(floor));
                        }
                        output.accept(ModItems.BRIEFCASE.get());
                        output.accept(ModItems.FIXER_LONGSWORD.get());
                        output.accept(ModItems.FIXER_MACE.get());
                        output.accept(ModItems.FIXER_DAGGER.get());
                        output.accept(ModItems.FIXER_REVOLVER.get());
                        output.accept(ModItems.FIXER_BULLET.get());
                        output.accept(ModItems.RUSTY_PIPE.get());
                        output.accept(ModItems.ZWEI_GREATSWORD.get());
                        output.accept(ModItems.SHI_BLADE.get());
                        output.accept(ModItems.LIU_GAUNTLET.get());
                        output.accept(ModItems.SEVEN_CANE.get());
                        output.accept(ModItems.THUMB_RIFLE.get());
                        output.accept(ModItems.KUROKUMO_BLADE.get());
                        output.accept(ModItems.YUN_MACHETE.get());
                        output.accept(ModItems.HOOK_BLADE.get());
                        output.accept(ModItems.STREETLIGHT_STAFF.get());
                        output.accept(ModItems.MOLAR_HAMMER.get());
                        output.accept(ModItems.FULL_STOP_RIFLE.get());
                        output.accept(ModItems.DAWN_SWORD.get());
                        output.accept(ModItems.GAZE_RAPIER.get());
                        output.accept(ModItems.WEDGE_SPEAR.get());
                        output.accept(ModItems.WORKSHOP_HALBERD.get());
                        output.accept(ModItems.JEONG_TWIN_BLADES.get());
                        output.accept(ModItems.W_CORP_BATON.get());
                        output.accept(ModItems.WARP_BLADE.get());
                        output.accept(ModItems.SMILING_MAW.get());
                        output.accept(ModItems.INDEX_BLADE.get());
                        output.accept(ModItems.PHILIP_SWORD.get());
                        output.accept(ModItems.CANE_OFFICE_CANE.get());
                        output.accept(ModItems.PROXY_BLADE.get());
                        output.accept(ModItems.LIU_FIRE_SWORD.get());
                        output.accept(ModItems.R_CORP_RIFLE.get());
                        output.accept(ModItems.RHINO_GAUNTLET.get());
                        output.accept(ModItems.REINDEER_STAFF.get());
                        output.accept(ModItems.RED_MIST_BLADE.get());
                        output.accept(ModItems.PURPLE_TEAR_SWORD.get());
                        output.accept(ModItems.YAN_BLADE.get());
                        output.accept(ModItems.ALLEN_STILETTO.get());
                        output.accept(ModItems.SMOKE_GEAR_BLADE.get());
                        output.accept(ModItems.HANA_SWORD.get());
                        ModItems.FIXER_SUIT_SET.forEach(i -> output.accept(i.get()));
                        ModItems.HEAVY_COAT_SET.forEach(i -> output.accept(i.get()));
                        output.accept(ModItems.BLANK_KEY_PAGE.get());
                        ModItems.KEY_PAGES.values().forEach(i -> output.accept(i.get()));
                        ModItems.ACCESSORIES.values().forEach(i -> output.accept(i.get()));
                        output.accept(ModItems.FIRST_AID_KIT.get());
                        output.accept(ModItems.FLASHBANG.get());
                        output.accept(ModItems.SMOKE_BOMB.get());
                        output.accept(ModItems.PAINKILLER.get());
                    })
                    .build());

    private ModCreativeTabs() {}
}
