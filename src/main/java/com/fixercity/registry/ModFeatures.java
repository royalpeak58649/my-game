package com.fixercity.registry;

import com.fixercity.FixerCity;
import com.fixercity.world.CityBlockFeature;
import net.minecraft.core.registries.Registries;
import net.minecraft.world.level.levelgen.feature.Feature;
import net.minecraft.world.level.levelgen.feature.configurations.NoneFeatureConfiguration;
import net.neoforged.neoforge.registries.DeferredHolder;
import net.neoforged.neoforge.registries.DeferredRegister;

public final class ModFeatures {
    public static final DeferredRegister<Feature<?>> REGISTER = DeferredRegister.create(Registries.FEATURE, FixerCity.MODID);

    public static final DeferredHolder<Feature<?>, CityBlockFeature> CITY_BLOCK =
            REGISTER.register("city_block", () -> new CityBlockFeature(NoneFeatureConfiguration.CODEC));

    private ModFeatures() {}
}
