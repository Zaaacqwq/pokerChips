-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(6) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `hostToken` VARCHAR(32) NOT NULL,
    `chip_rate` DOUBLE NOT NULL,
    `default_buyin` INTEGER NOT NULL,
    `status` ENUM('active', 'settling', 'completed') NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `settled_at` DATETIME(3) NULL,

    UNIQUE INDEX `sessions_hostToken_key`(`hostToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `players` (
    `id` VARCHAR(36) NOT NULL,
    `session_id` VARCHAR(6) NOT NULL,
    `nickname` VARCHAR(50) NOT NULL,
    `playerToken` VARCHAR(32) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `players_playerToken_key`(`playerToken`),
    UNIQUE INDEX `players_session_id_nickname_key`(`session_id`, `nickname`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `id` VARCHAR(36) NOT NULL,
    `session_id` VARCHAR(6) NOT NULL,
    `player_id` VARCHAR(36) NOT NULL,
    `type` ENUM('buyin', 'cashout') NOT NULL,
    `chips` INTEGER NOT NULL,
    `chip_breakdown` JSON NULL,
    `voided` BOOLEAN NOT NULL DEFAULT false,
    `voided_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `transactions_session_id_idx`(`session_id`),
    INDEX `transactions_player_id_idx`(`player_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `players` ADD CONSTRAINT `players_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_player_id_fkey` FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
