import { ApiProperty } from "@nestjs/swagger";

// Generic success / error
export class SuccessResponseDto {
	@ApiProperty({ example: true })
	success!: boolean;
}

export class ErrorResponseDto {
	@ApiProperty({ example: "Failed to load agent" })
	error!: string;
}

// Agents
export class AgentListItemDto {
	@ApiProperty() path!: string;
	@ApiProperty() name!: string;
	@ApiProperty() directory!: string;
	@ApiProperty() relativePath!: string;
}

export class AgentsListResponseDto {
	@ApiProperty({ type: [AgentListItemDto] })
	agents!: AgentListItemDto[];
}

// Messages
export class MessageItemDto {
	@ApiProperty({ example: 1 }) id!: number;
	@ApiProperty({ enum: ["user", "assistant"], example: "user" }) type!:
		| "user"
		| "assistant";
	@ApiProperty({ example: "Hello" }) content!: string;
	@ApiProperty({ example: new Date().toISOString() }) timestamp!: string;
}

export class MessagesResponseDto {
	@ApiProperty({ type: [MessageItemDto] })
	messages!: MessageItemDto[];
}

export class MessageResponseDto {
	@ApiProperty({ example: "Hi there!" })
	response!: string;
}

// Sessions
export class SessionResponseDto {
	@ApiProperty() id!: string;
	@ApiProperty() appName!: string;
	@ApiProperty() userId!: string;
	@ApiProperty({ type: Object }) state!: Record<string, any>;
	@ApiProperty({ example: 3 }) eventCount!: number;
	@ApiProperty({ example: Date.now() }) lastUpdateTime!: number;
	@ApiProperty({ example: Date.now() }) createdAt!: number;
}

export class SessionsResponseDto {
	@ApiProperty({ type: [SessionResponseDto] })
	sessions!: SessionResponseDto[];
}

// Events
export class EventItemDto {
	@ApiProperty() id!: string;
	@ApiProperty() author!: string;
	@ApiProperty({ example: Date.now() }) timestamp!: number;
	@ApiProperty({ description: "Raw event content", type: Object })
	content!: any;
	@ApiProperty({ type: Object, nullable: true }) actions!: any;
	@ApiProperty({ type: [Object] }) functionCalls!: any[];
	@ApiProperty({ type: [Object] }) functionResponses!: any[];
	@ApiProperty({ required: false, nullable: true }) branch?: string;
	@ApiProperty({ example: false }) isFinalResponse!: boolean;
}

export class EventsResponseDto {
	@ApiProperty({ type: [EventItemDto] }) events!: EventItemDto[];
	@ApiProperty({ example: 1 }) totalCount!: number;
}

// State
export class StateMetadataDto {
	@ApiProperty({ example: Date.now() }) lastUpdated!: number;
	@ApiProperty({ example: 0 }) changeCount!: number;
	@ApiProperty({ example: 5 }) totalKeys!: number;
	@ApiProperty({ example: 120 }) sizeBytes!: number;
}

export class StateResponseDto {
	@ApiProperty({ type: Object }) agentState!: Record<string, any>;
	@ApiProperty({ type: Object }) userState!: Record<string, any>;
	@ApiProperty({ type: Object }) sessionState!: Record<string, any>;
	@ApiProperty({ type: StateMetadataDto }) metadata!: StateMetadataDto;
}

// Health
export class HealthResponseDto {
	@ApiProperty({ example: "ok" }) status!: string;
}
