CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`sender_key` text NOT NULL,
	`object_key` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_key` text NOT NULL,
	`agent_id` text NOT NULL,
	`person_id` integer NOT NULL,
	`person_name` text NOT NULL,
	`user_name` text NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL,
	`user_read` integer DEFAULT 0 NOT NULL,
	`partner_read` integer DEFAULT 0 NOT NULL,
	`user_delivered` integer DEFAULT 0 NOT NULL,
	`partner_delivered` integer DEFAULT 0 NOT NULL,
	`user_prefs` text DEFAULT '{}' NOT NULL,
	`partner_prefs` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversation_owner_person` ON `conversations` (`user_key`,`agent_id`,`person_id`);--> statement-breakpoint
CREATE INDEX `conversation_agent` ON `conversations` (`agent_id`,`updated`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`conversation_id` text NOT NULL,
	`client_id` text NOT NULL,
	`sender` text NOT NULL,
	`sender_key` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`kind` text DEFAULT 'text' NOT NULL,
	`attachment_id` text,
	`reply_to` text,
	`created` integer NOT NULL,
	`recalled` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `messages_id_unique` ON `messages` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `message_idempotency` ON `messages` (`conversation_id`,`sender_key`,`client_id`);--> statement-breakpoint
CREATE INDEX `message_page` ON `messages` (`conversation_id`,`seq`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`site_user` text NOT NULL,
	`user_key` text,
	`role` text NOT NULL,
	`agent_id` text,
	`revision` integer DEFAULT 0 NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`site_user` text NOT NULL,
	`agent_id` text NOT NULL,
	`name` text NOT NULL,
	`created` integer NOT NULL
);
