CREATE TABLE `captures` (
	`id` text PRIMARY KEY NOT NULL,
	`space` text NOT NULL,
	`owner` text NOT NULL,
	`label` text NOT NULL,
	`created` text NOT NULL,
	`frames` text NOT NULL,
	`objects` text DEFAULT '[]' NOT NULL,
	`mode` text DEFAULT 'manual' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `captures_space` ON `captures` (`space`);--> statement-breakpoint
CREATE TABLE `config` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`space` text NOT NULL,
	`user` text NOT NULL,
	`found` integer NOT NULL,
	`intent` text NOT NULL,
	`seconds` real NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`space` text NOT NULL,
	`kind` text NOT NULL,
	`cost` real NOT NULL,
	`input` integer DEFAULT 0 NOT NULL,
	`output` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `members` (
	`space` text NOT NULL,
	`user` text NOT NULL,
	PRIMARY KEY(`space`, `user`)
);
--> statement-breakpoint
CREATE TABLE `spaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner` text NOT NULL,
	`invite` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `spaces_invite_unique` ON `spaces` (`invite`);