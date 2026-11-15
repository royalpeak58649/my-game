package com.fixercity.world;

import com.fixercity.registry.ModBlocks;
import com.fixercity.request.Request;
import com.fixercity.request.RequestGenerator;
import com.fixercity.request.RequestType;
import com.mojang.logging.LogUtils;
import java.util.EnumSet;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.util.RandomSource;
import net.minecraft.world.level.block.state.BlockState;
import net.neoforged.neoforge.event.server.ServerStartedEvent;
import org.slf4j.Logger;

/**
 * CI 전용 점검 (-Dfixercity.smoke=true 일 때만): 도시 청크를 실제로 생성해 보고, 모든 의뢰 종류를 생성해 본다.
 * 문제가 있으면 ERROR 로그를 남겨 CI가 실패하게 한다.
 */
public final class SmokeTest {
    private static final Logger LOGGER = LogUtils.getLogger();

    private SmokeTest() {}

    public static void onServerStarted(ServerStartedEvent event) {
        if (!Boolean.getBoolean("fixercity.smoke")) {
            return;
        }
        ServerLevel city = event.getServer().getLevel(CityDimension.THE_CITY);
        if (city == null) {
            LOGGER.error("fixercity smoke: the_city dimension is missing");
            return;
        }
        int[][] chunks = {{0, 0}, {1, 1}, {3, 2}, {8, 0}, {-12, 7}, {25, 4}, {40, -3}};
        for (int[] c : chunks) {
            city.getChunk(c[0], c[1]);
        }
        BlockState board = city.getBlockState(new BlockPos(10, CityDimension.GROUND + 1, 5));
        if (!board.is(ModBlocks.REQUEST_BOARD.get())) {
            LOGGER.error("fixercity smoke: no request board at the spawn plaza (found {})", board);
        } else {
            LOGGER.info("fixercity smoke: city generation OK");
        }

        com.fixercity.reception.ReceptionManager.smoke(event.getServer(), LOGGER);
        com.fixercity.event.CityEvents.smoke(event.getServer(), LOGGER);

        EnumSet<RequestType> seen = EnumSet.noneOf(RequestType.class);
        RandomSource random = RandomSource.create(1);
        for (int g = 1; g <= 9; g++) {
            for (int i = 0; i < 60; i++) {
                Request r = RequestGenerator.generate(random, i, g, BlockPos.ZERO, "minecraft:overworld");
                seen.add(r.type);
                Request.load(r.save());
            }
        }
        if (seen.contains(RequestType.DELIVERY)) {
            LOGGER.error("fixercity smoke: retired delivery requests still generated");
        } else if (seen.size() != RequestType.values().length - 1) {
            LOGGER.error("fixercity smoke: some request types never generated: {}", seen);
        } else {
            LOGGER.info("fixercity smoke: all {} request types generated", seen.size());
        }
    }
}
