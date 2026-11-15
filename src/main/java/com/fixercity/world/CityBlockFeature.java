package com.fixercity.world;

import com.fixercity.FixerCity;
import com.fixercity.registry.ModBlocks;
import com.mojang.serialization.Codec;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.util.RandomSource;
import net.minecraft.world.RandomizableContainer;
import net.minecraft.world.level.WorldGenLevel;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.ChestBlock;
import net.minecraft.world.level.block.LadderBlock;
import net.minecraft.world.level.block.StairBlock;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.levelgen.feature.Feature;
import net.minecraft.world.level.levelgen.feature.FeaturePlaceContext;
import net.minecraft.world.level.levelgen.feature.configurations.NoneFeatureConfiguration;
import net.minecraft.world.level.storage.loot.LootTable;

/**
 * 도시 한 블록(청크 하나)을 짓는다. 청크마다 서쪽·북쪽 가장자리에 도로가 있고, 나머지 12x12가 부지다.
 * 중심(0,0)에서의 거리로 구역이 나뉜다:
 *   둥지 (160칸 안)   : 깨끗한 고층 빌딩, 밝은 가로등 -> 비교적 안전
 *   뒷골목 (480칸 안) : 낡은 저층 건물, 골목, 공터, 어두운 실내
 *   외곽 (그 밖)      : 무너진 폐허, 거미줄, 자갈길 -> 위험
 * 8x8 청크마다 (그리고 0,0) 광장이 있고, 광장 북쪽에 의뢰 게시판이 놓인다.
 */
public class CityBlockFeature extends Feature<NoneFeatureConfiguration> {
    public enum District { NEST, BACKSTREETS, OUTSKIRTS }

    public static final ResourceKey<LootTable> ROOM_LOOT = ResourceKey.create(Registries.LOOT_TABLE, FixerCity.id("chests/city_room"));
    private static final int G = CityDimension.GROUND;
    private static final int ROAD = 4;

    public CityBlockFeature(Codec<NoneFeatureConfiguration> codec) {
        super(codec);
    }

    public static District districtAt(int x, int z) {
        double d = Math.sqrt((double) x * x + (double) z * z);
        return d < 160 ? District.NEST : d < 480 ? District.BACKSTREETS : District.OUTSKIRTS;
    }

    public static boolean isPlaza(int cx, int cz) {
        if (cx == 0 && cz == 0) {
            return true;
        }
        return districtAt(cx * 16 + 8, cz * 16 + 8) != District.OUTSKIRTS && Math.floorMod(cx, 8) == 0 && Math.floorMod(cz, 8) == 0;
    }

    @Override
    public boolean place(FeaturePlaceContext<NoneFeatureConfiguration> ctx) {
        WorldGenLevel level = ctx.level();
        int x0 = ctx.origin().getX() & ~15;
        int z0 = ctx.origin().getZ() & ~15;
        int cx = x0 >> 4;
        int cz = z0 >> 4;
        RandomSource r = RandomSource.create(level.getSeed() ^ (cx * 341873128712L + cz * 132897987541L));
        District d = districtAt(x0 + 8, z0 + 8);
        Builder b = new Builder(level, x0, z0, r);

        b.roads(d);
        if (isPlaza(cx, cz)) {
            b.plaza();
            return true;
        }
        int roll = r.nextInt(100);
        switch (d) {
            case NEST -> {
                if (roll < 15) {
                    b.park();
                } else {
                    b.building(ROAD, ROAD, 12, 12, 6 + r.nextInt(8), Palette.nest(r));
                }
            }
            case BACKSTREETS -> {
                if (roll < 12) {
                    b.emptyLot(false);
                } else if (roll < 55) {
                    // 두 건물 사이 골목
                    b.building(ROAD, ROAD, 12, 5, 2 + r.nextInt(3), Palette.backstreets(r));
                    b.building(ROAD, ROAD + 7, 12, 5, 2 + r.nextInt(3), Palette.backstreets(r));
                    b.alley(ROAD + 5);
                } else {
                    b.building(ROAD, ROAD, 12, 12, 2 + r.nextInt(3), Palette.backstreets(r));
                }
            }
            case OUTSKIRTS -> {
                if (roll < 25) {
                    b.emptyLot(true);
                } else {
                    b.building(ROAD, ROAD, 12, 12, 1 + r.nextInt(3), Palette.outskirts(r));
                }
            }
        }
        return true;
    }

    /** 건물 재료 묶음. */
    record Palette(BlockState wall, BlockState accent, BlockState window, BlockState floor, BlockState roof,
            boolean lit, float ruin, boolean cobwebs) {
        static BlockState pick(RandomSource r, Block... blocks) {
            return blocks[r.nextInt(blocks.length)].defaultBlockState();
        }

        static Palette nest(RandomSource r) {
            return new Palette(pick(r, Blocks.WHITE_CONCRETE, Blocks.QUARTZ_BLOCK, Blocks.LIGHT_GRAY_CONCRETE, Blocks.SMOOTH_QUARTZ),
                    pick(r, Blocks.GRAY_CONCRETE, Blocks.QUARTZ_PILLAR, Blocks.POLISHED_ANDESITE),
                    pick(r, Blocks.LIGHT_BLUE_STAINED_GLASS, Blocks.GLASS, Blocks.CYAN_STAINED_GLASS),
                    Blocks.SMOOTH_STONE.defaultBlockState(), Blocks.SMOOTH_QUARTZ.defaultBlockState(), true, 0F, false);
        }

        static Palette backstreets(RandomSource r) {
            return new Palette(pick(r, Blocks.BRICKS, Blocks.STONE_BRICKS, Blocks.TERRACOTTA, Blocks.BROWN_TERRACOTTA,
                            Blocks.LIGHT_GRAY_TERRACOTTA, Blocks.DEEPSLATE_BRICKS, Blocks.MUD_BRICKS),
                    pick(r, Blocks.STONE_BRICKS, Blocks.SMOOTH_STONE, Blocks.DARK_OAK_PLANKS, Blocks.POLISHED_DEEPSLATE),
                    pick(r, Blocks.GRAY_STAINED_GLASS, Blocks.GLASS, Blocks.BROWN_STAINED_GLASS),
                    pick(r, Blocks.SPRUCE_PLANKS, Blocks.OAK_PLANKS, Blocks.STONE),
                    pick(r, Blocks.COBBLESTONE, Blocks.DARK_OAK_PLANKS, Blocks.STONE_BRICKS), r.nextInt(10) < 3, 0F, false);
        }

        static Palette outskirts(RandomSource r) {
            return new Palette(pick(r, Blocks.CRACKED_STONE_BRICKS, Blocks.MOSSY_STONE_BRICKS, Blocks.COBBLESTONE, Blocks.MOSSY_COBBLESTONE),
                    pick(r, Blocks.COBBLESTONE, Blocks.STONE),
                    Blocks.AIR.defaultBlockState(),
                    Blocks.COBBLESTONE.defaultBlockState(), Blocks.AIR.defaultBlockState(), false, 0.22F, true);
        }
    }

    /** 청크 하나를 짓는 도우미. 좌표는 청크 안 로컬 (0~15). */
    static final class Builder {
        private final WorldGenLevel level;
        private final int x0;
        private final int z0;
        private final RandomSource r;
        private final BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();

        Builder(WorldGenLevel level, int x0, int z0, RandomSource r) {
            this.level = level;
            this.x0 = x0;
            this.z0 = z0;
            this.r = r;
        }

        void set(int lx, int y, int lz, BlockState state) {
            level.setBlock(pos.set(x0 + lx, y, z0 + lz), state, 2);
        }

        BlockState get(int lx, int y, int lz) {
            return level.getBlockState(pos.set(x0 + lx, y, z0 + lz));
        }

        void roads(District d) {
            for (int lx = 0; lx < 16; lx++) {
                for (int lz = 0; lz < 16; lz++) {
                    boolean rx = lx < ROAD;
                    boolean rz = lz < ROAD;
                    if (!rx && !rz) {
                        continue;
                    }
                    boolean sidewalk = (rx && !rz && lx == ROAD - 1) || (rz && !rx && lz == ROAD - 1) || (lx == ROAD - 1 && lz == ROAD - 1);
                    BlockState s;
                    if (sidewalk) {
                        s = switch (d) {
                            case NEST -> Blocks.POLISHED_ANDESITE.defaultBlockState();
                            case BACKSTREETS -> r.nextInt(8) == 0 ? Blocks.CRACKED_STONE_BRICKS.defaultBlockState() : Blocks.STONE_BRICKS.defaultBlockState();
                            case OUTSKIRTS -> r.nextBoolean() ? Blocks.MOSSY_COBBLESTONE.defaultBlockState() : Blocks.COBBLESTONE.defaultBlockState();
                        };
                    } else {
                        boolean lane = (rx && !rz && lx == 1 && Math.floorMod(z0 + lz, 4) < 2) || (rz && !rx && lz == 1 && Math.floorMod(x0 + lx, 4) < 2);
                        s = switch (d) {
                            case NEST -> lane ? Blocks.YELLOW_CONCRETE.defaultBlockState() : Blocks.BLACK_CONCRETE.defaultBlockState();
                            case BACKSTREETS -> lane && r.nextInt(3) > 0 ? Blocks.YELLOW_TERRACOTTA.defaultBlockState()
                                    : r.nextInt(20) == 0 ? Blocks.COBBLESTONE.defaultBlockState() : Blocks.GRAY_CONCRETE.defaultBlockState();
                            case OUTSKIRTS -> switch (r.nextInt(4)) {
                                case 0 -> Blocks.GRAVEL.defaultBlockState();
                                case 1 -> Blocks.COARSE_DIRT.defaultBlockState();
                                case 2 -> Blocks.COBBLESTONE.defaultBlockState();
                                default -> Blocks.GRAY_CONCRETE.defaultBlockState();
                            };
                        };
                    }
                    set(lx, G, lz, s);
                }
            }
            // 가로등 (교차로 모서리)
            int chance = switch (d) {
                case NEST -> 100;
                case BACKSTREETS -> 55;
                case OUTSKIRTS -> 15;
            };
            if (r.nextInt(100) < chance) {
                lamp(ROAD - 1, ROAD - 1, d);
            }
            if (d == District.NEST) {
                lamp(ROAD - 1, 11, d);
                lamp(11, ROAD - 1, d);
            }
        }

        void lamp(int lx, int lz, District d) {
            BlockState post = d == District.NEST ? Blocks.POLISHED_BLACKSTONE_WALL.defaultBlockState() : Blocks.COBBLESTONE_WALL.defaultBlockState();
            int h = d == District.NEST ? 4 : 3;
            for (int y = 1; y <= h; y++) {
                set(lx, G + y, lz, post);
            }
            BlockState light = switch (d) {
                case NEST -> Blocks.SEA_LANTERN.defaultBlockState();
                case BACKSTREETS -> Blocks.LANTERN.defaultBlockState();
                case OUTSKIRTS -> Blocks.AIR.defaultBlockState(); // 고장 난 가로등
            };
            set(lx, G + h + 1, lz, light);
        }

        /**
         * 건물. (bx,bz) 로컬 시작점, w x dpt 크기, floors 층 (층당 4칸).
         * 북쪽 벽에 출입구, 동남쪽 안쪽 모서리에 사다리, 층마다 확률로 상자.
         */
        void building(int bx, int bz, int w, int dpt, int floors, Palette p) {
            int h = floors * 4;
            int ruinCut = p.ruin() > 0 ? 2 + r.nextInt(Math.max(1, h)) : h + 1;
            int ladderX = w - 2;
            int ladderZ = dpt - 2;
            for (int y = 0; y <= h; y++) {
                for (int i = 0; i < w; i++) {
                    for (int k = 0; k < dpt; k++) {
                        boolean edge = i == 0 || k == 0 || i == w - 1 || k == dpt - 1;
                        boolean corner = (i == 0 || i == w - 1) && (k == 0 || k == dpt - 1);
                        boolean ladder = i == ladderX && k == ladderZ;
                        int lx = bx + i;
                        int lz = bz + k;
                        if (y > ruinCut) {
                            continue;
                        }
                        if (y == 0) {
                            if (!edge) {
                                set(lx, G, lz, p.floor());
                            }
                            continue;
                        }
                        if (edge) {
                            if (p.ruin() > 0 && y > 2 && r.nextFloat() < p.ruin()) {
                                continue;
                            }
                            boolean door = k == 0 && (i == w / 2 - 1 || i == w / 2) && y <= 2;
                            if (door) {
                                set(lx, G + y, lz, Blocks.AIR.defaultBlockState());
                                continue;
                            }
                            int fy = y % 4;
                            boolean windowRow = fy == 2 || fy == 3;
                            boolean windowCol = (k == 0 || k == dpt - 1) ? i % 2 == 1 : k % 2 == 1;
                            BlockState s = corner ? p.accent() : (windowRow && windowCol ? p.window() : p.wall());
                            if (y == h) {
                                s = p.accent();
                            }
                            set(lx, G + y, lz, s);
                        } else if (y % 4 == 0) {
                            // 층 바닥 / 지붕
                            if (ladder) {
                                set(lx, G + y, lz, Blocks.AIR.defaultBlockState());
                            } else if (y == h) {
                                if (!p.roof().isAir()) {
                                    set(lx, G + y, lz, p.roof());
                                }
                            } else if (p.lit() && i == w / 2 && k == dpt / 2) {
                                set(lx, G + y, lz, Blocks.SEA_LANTERN.defaultBlockState());
                            } else if (p.ruin() == 0 || r.nextFloat() > p.ruin()) {
                                set(lx, G + y, lz, p.floor());
                            }
                        } else if (p.cobwebs() && r.nextInt(30) == 0) {
                            set(lx, G + y, lz, Blocks.COBWEB.defaultBlockState());
                        }
                    }
                }
            }
            // 사다리 (동쪽 벽에 붙음)
            for (int y = 1; y < Math.min(h, ruinCut); y++) {
                if (!get(bx + ladderX + 1, G + y, bz + ladderZ).isAir()) {
                    set(bx + ladderX, G + y, bz + ladderZ, Blocks.LADDER.defaultBlockState().setValue(LadderBlock.FACING, Direction.WEST));
                }
            }
            // 층마다 상자
            for (int f = 0; f < floors; f++) {
                int y = G + f * 4 + 1;
                if (y > G + ruinCut || r.nextInt(100) >= 30) {
                    continue;
                }
                BlockPos chest = new BlockPos(x0 + bx + 1, y, z0 + bz + dpt - 2);
                level.setBlock(chest, Blocks.CHEST.defaultBlockState().setValue(ChestBlock.FACING, Direction.NORTH), 2);
                RandomizableContainer.setBlockEntityLootTable(level, r, chest, ROOM_LOOT);
            }
            // 둥지 빌딩 옥상 조명
            if (p.lit() && p.ruin() == 0 && floors >= 5) {
                set(bx, G + h + 1, bz, Blocks.SEA_LANTERN.defaultBlockState());
                set(bx + w - 1, G + h + 1, bz + dpt - 1, Blocks.SEA_LANTERN.defaultBlockState());
            }
        }

        void alley(int lz) {
            for (int lx = ROAD; lx < 16; lx++) {
                for (int k = lz; k < lz + 2; k++) {
                    set(lx, G, k, r.nextInt(4) == 0 ? Blocks.GRAVEL.defaultBlockState() : Blocks.STONE.defaultBlockState());
                }
            }
            if (r.nextBoolean()) {
                set(10, G + 1, lz, Blocks.BARREL.defaultBlockState());
            }
            if (r.nextInt(3) == 0) {
                set(13, G + 1, lz + 1, Blocks.COBWEB.defaultBlockState());
            }
        }

        void emptyLot(boolean ruins) {
            for (int lx = ROAD; lx < 16; lx++) {
                for (int lz = ROAD; lz < 16; lz++) {
                    int n = r.nextInt(10);
                    set(lx, G, lz, n < 4 ? Blocks.GRAVEL.defaultBlockState() : n < 7 ? Blocks.COARSE_DIRT.defaultBlockState()
                            : Blocks.COBBLESTONE.defaultBlockState());
                    if (r.nextInt(14) == 0) {
                        int pile = 1 + r.nextInt(ruins ? 3 : 2);
                        for (int y = 1; y <= pile; y++) {
                            set(lx, G + y, lz, ruins ? Blocks.MOSSY_COBBLESTONE.defaultBlockState() : Blocks.COBBLESTONE.defaultBlockState());
                        }
                    } else if (r.nextInt(40) == 0) {
                        set(lx, G + 1, lz, ruins ? Blocks.COBWEB.defaultBlockState() : Blocks.BARREL.defaultBlockState());
                    }
                }
            }
        }

        void park() {
            for (int lx = ROAD; lx < 16; lx++) {
                for (int lz = ROAD; lz < 16; lz++) {
                    boolean path = lx == 9 || lz == 9;
                    set(lx, G, lz, path ? Blocks.SMOOTH_STONE.defaultBlockState() : Blocks.GRASS_BLOCK.defaultBlockState());
                    if (!path) {
                        int n = r.nextInt(12);
                        if (n == 0) {
                            set(lx, G + 1, lz, Blocks.OAK_LEAVES.defaultBlockState());
                        } else if (n == 1) {
                            set(lx, G + 1, lz, r.nextBoolean() ? Blocks.POPPY.defaultBlockState() : Blocks.DANDELION.defaultBlockState());
                        } else if (n < 5) {
                            set(lx, G + 1, lz, Blocks.SHORT_GRASS.defaultBlockState());
                        }
                    }
                }
            }
            set(8, G + 1, 6, Blocks.OAK_STAIRS.defaultBlockState().setValue(StairBlock.FACING, Direction.WEST));
            set(10, G + 1, 12, Blocks.OAK_STAIRS.defaultBlockState().setValue(StairBlock.FACING, Direction.EAST));
            lamp(9, 9, District.NEST);
        }

        /** 광장: 매끈한 바닥, 분수, 벤치, 가로등, 북쪽에 의뢰 게시판. */
        void plaza() {
            for (int lx = ROAD; lx < 16; lx++) {
                for (int lz = ROAD; lz < 16; lz++) {
                    boolean border = lx == ROAD || lz == ROAD || lx == 15 || lz == 15;
                    set(lx, G, lz, border ? Blocks.STONE_BRICKS.defaultBlockState() : Blocks.SMOOTH_STONE.defaultBlockState());
                }
            }
            // 분수 (중앙 3x3 물, 돌벽 테두리)
            for (int lx = 8; lx <= 12; lx++) {
                for (int lz = 8; lz <= 12; lz++) {
                    boolean rim = lx == 8 || lz == 8 || lx == 12 || lz == 12;
                    if (rim) {
                        set(lx, G + 1, lz, Blocks.STONE_BRICK_SLAB.defaultBlockState());
                    } else {
                        set(lx, G, lz, Blocks.WATER.defaultBlockState());
                    }
                }
            }
            set(10, G, 10, Blocks.SEA_LANTERN.defaultBlockState());
            // 의뢰 게시판
            set(10, G + 1, ROAD + 1, ModBlocks.REQUEST_BOARD.get().defaultBlockState());
            set(9, G + 1, ROAD + 1, Blocks.LANTERN.defaultBlockState());
            set(11, G + 1, ROAD + 1, Blocks.LANTERN.defaultBlockState());
            // 벤치
            set(6, G + 1, 10, Blocks.OAK_STAIRS.defaultBlockState().setValue(StairBlock.FACING, Direction.WEST));
            set(14, G + 1, 10, Blocks.OAK_STAIRS.defaultBlockState().setValue(StairBlock.FACING, Direction.EAST));
            lamp(ROAD + 1, 14, District.NEST);
            lamp(14, 14, District.NEST);
        }
    }
}
