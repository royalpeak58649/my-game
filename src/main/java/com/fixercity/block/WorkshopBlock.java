package com.fixercity.block;

import com.fixercity.progress.Workshop;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.BlockHitResult;

/** 공방 작업대: 우클릭하면 신체 개조·무기 강화 화면이 열린다. 강화할 무기는 주 손에 든다. */
public class WorkshopBlock extends Block {
    public WorkshopBlock(Properties properties) {
        super(properties);
    }

    @Override
    protected InteractionResult useWithoutItem(BlockState state, Level level, BlockPos pos, Player player, BlockHitResult hit) {
        if (player instanceof ServerPlayer sp) {
            Workshop.recordVisit(sp, pos);
            Workshop.send(sp);
            level.playSound(null, pos, SoundEvents.SMITHING_TABLE_USE, SoundSource.BLOCKS, 0.6F, 1.2F);
        }
        return InteractionResult.sidedSuccess(level.isClientSide());
    }
}
