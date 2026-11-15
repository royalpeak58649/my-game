package com.fixercity.block;

import com.fixercity.request.RequestManager;
import com.fixercity.request.RequestUi;
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

/** 의뢰 게시판. 우클릭하면 의뢰 목록과 상점이 채팅에 뜬다. 끝난 의뢰는 자동으로 보고된다. */
public class RequestBoardBlock extends Block {
    public RequestBoardBlock(Properties properties) {
        super(properties);
    }

    @Override
    protected InteractionResult useWithoutItem(BlockState state, Level level, BlockPos pos, Player player, BlockHitResult hit) {
        if (player instanceof ServerPlayer serverPlayer) {
            RequestManager.recordBoardVisit(serverPlayer, pos);
            RequestManager.refillPool(serverPlayer, pos);
            RequestManager.reportIfDone(serverPlayer);
            RequestUi.showBoard(serverPlayer);
            level.playSound(null, pos, SoundEvents.BOOK_PAGE_TURN, SoundSource.BLOCKS, 1.0F, 1.0F);
        }
        return InteractionResult.sidedSuccess(level.isClientSide());
    }
}
