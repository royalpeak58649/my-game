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
                        ModItems.FIXER_SUIT_SET.forEach(i -> output.accept(i.get()));
                        ModItems.HEAVY_COAT_SET.forEach(i -> output.accept(i.get()));
                        output.accept(ModItems.BLANK_KEY_PAGE.get());
                        ModItems.KEY_PAGES.values().forEach(i -> output.accept(i.get()));
                    })
                    .build());

    private ModCreativeTabs() {}
}
