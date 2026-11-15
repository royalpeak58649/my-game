package com.fixercity;

import com.fixercity.event.FixerEvents;
import com.fixercity.combat.CombatHandler;
import com.fixercity.network.ModNetwork;
import com.fixercity.registry.ModArmorMaterials;
import com.fixercity.registry.ModBlocks;
import com.fixercity.request.RequestCommands;
import com.fixercity.request.RequestManager;
import com.fixercity.registry.ModAttachments;
import com.fixercity.registry.ModEffects;
import com.fixercity.registry.ModCreativeTabs;
import com.fixercity.registry.ModDataComponents;
import com.fixercity.registry.ModItems;
import com.mojang.logging.LogUtils;
import net.minecraft.resources.ResourceLocation;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.fml.ModContainer;
import net.neoforged.fml.common.Mod;
import net.neoforged.neoforge.common.NeoForge;
import org.slf4j.Logger;

/** 해결사의 도시 (Fixer City) 메인 클래스. */
@Mod(FixerCity.MODID)
public class FixerCity {
    public static final String MODID = "fixercity";
    public static final Logger LOGGER = LogUtils.getLogger();

    public FixerCity(IEventBus modEventBus, ModContainer modContainer) {
        ModDataComponents.REGISTER.register(modEventBus);
        ModArmorMaterials.REGISTER.register(modEventBus);
        ModBlocks.REGISTER.register(modEventBus);
        ModItems.REGISTER.register(modEventBus);
        ModCreativeTabs.REGISTER.register(modEventBus);
        ModAttachments.REGISTER.register(modEventBus);
        ModEffects.REGISTER.register(modEventBus);
        com.fixercity.registry.ModFeatures.REGISTER.register(modEventBus);
        modEventBus.addListener(ModNetwork::register);

        NeoForge.EVENT_BUS.register(FixerEvents.class);
        NeoForge.EVENT_BUS.register(CombatHandler.class);
        NeoForge.EVENT_BUS.register(RequestManager.class);
        NeoForge.EVENT_BUS.register(com.fixercity.reception.ReceptionManager.class);
        NeoForge.EVENT_BUS.addListener(com.fixercity.world.SmokeTest::onServerStarted);
        NeoForge.EVENT_BUS.register(RequestCommands.class);
        NeoForge.EVENT_BUS.register(com.fixercity.progress.Workshop.class);
        NeoForge.EVENT_BUS.register(com.fixercity.event.CityEvents.class);
        NeoForge.EVENT_BUS.register(com.fixercity.event.KillRewards.class);
        NeoForge.EVENT_BUS.register(com.fixercity.request.OfficeCommands.class);
    }

    public static ResourceLocation id(String path) {
        return ResourceLocation.fromNamespaceAndPath(MODID, path);
    }
}
