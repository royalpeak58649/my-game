package com.fixercity.registry;

import com.fixercity.FixerCity;
import com.fixercity.effect.BleedEffect;
import com.fixercity.effect.ExposedEffect;
import net.minecraft.core.registries.Registries;
import net.minecraft.world.effect.MobEffect;
import net.neoforged.neoforge.registries.DeferredHolder;
import net.neoforged.neoforge.registries.DeferredRegister;

public final class ModEffects {
    public static final DeferredRegister<MobEffect> REGISTER = DeferredRegister.create(Registries.MOB_EFFECT, FixerCity.MODID);

    public static final DeferredHolder<MobEffect, MobEffect> BLEED = REGISTER.register("bleed", BleedEffect::new);
    public static final DeferredHolder<MobEffect, MobEffect> EXPOSED = REGISTER.register("exposed", ExposedEffect::new);

    private ModEffects() {}
}
