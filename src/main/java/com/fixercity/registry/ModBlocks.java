package com.fixercity.registry;

import com.fixercity.FixerCity;
import com.fixercity.block.RequestBoardBlock;
import net.minecraft.world.level.block.SoundType;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.material.MapColor;
import net.neoforged.neoforge.registries.DeferredBlock;
import net.neoforged.neoforge.registries.DeferredRegister;

public final class ModBlocks {
    public static final DeferredRegister.Blocks REGISTER = DeferredRegister.createBlocks(FixerCity.MODID);

    public static final DeferredBlock<RequestBoardBlock> REQUEST_BOARD = REGISTER.register("request_board",
            () -> new RequestBoardBlock(BlockBehaviour.Properties.of().mapColor(MapColor.WOOD).strength(2.5F).sound(SoundType.WOOD)));

    public static final DeferredBlock<com.fixercity.block.WorkshopBlock> WORKSHOP = REGISTER.register("workshop",
            () -> new com.fixercity.block.WorkshopBlock(BlockBehaviour.Properties.of().mapColor(MapColor.METAL).strength(3.5F).sound(SoundType.ANVIL)));

    private ModBlocks() {}
}
