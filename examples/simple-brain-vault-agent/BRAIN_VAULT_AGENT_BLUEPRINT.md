# Brain Vault Agent Blueprint - Real Implementation

## 🧠 Overview

The **Brain Vault Agent** is an autonomous yield optimization bot that manages individual user vaults for maximum yield generation on Fraxlend lending pairs. The system consists of a web application for user interaction, a VaultCreator contract for vault deployment, individual vault contracts per user, and an intelligent bot that manages investments and rebalancing.

## 🏗️ Real Architecture

```bash
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Brain Vault System                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────┐ │
│  │   Web App/UI    │  │  VaultCreator   │  │  Individual     │  │Database │ │
│  │ • Vault Creation│  │   Contract      │  │ Vault Contract  │  │Records  │ │
│  │ • User Deposits │  │ • createVault() │  │ • deposit()     │  │& Config │ │
│  │ • Allowances    │  │ • Bot Access    │  │ • withdraw()    │  │         │ │
│  │ • Rebal Config  │  │ • Admin Control │  │ • yield()       │  │         │ │
│  │ └─────────────────┘  └─────────────────┘  │ • unyield()     │  │         │ │
│  │           │                     │          └─────────────────┘  │         │ │
│  │           └─────────────────────┼─────────────────────────────────┼─────────┘ │
│  │                                 │                                 │           │
│  │                      ┌─────────────────┐                         │           │
│  │                      │    Ingester     │                         │           │
│  │                      │ Seeds new vaults│◄────────────────────────┘           │
│  │                      │ to database     │                                     │
│  │                      └─────────────────┘                                     │
│  │                                 │                                             │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  │                     Brain Vault Agent (Bot)                            │ │
│  │  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │ │
│  │  │  │ Fraxlend MCP    │  │   Odos MCP      │  │  Database Service       │  │ │
│  │  │  │ • GET_STATS     │  │ • Swap Quotes   │  │ • Vault Records         │  │ │
│  │  │  │ • GET_POSITIONS │  │ • Execute Swaps │  │ • User Preferences      │  │ │
│  │  │  │ • LEND/BORROW   │  │ • Slippage Mgmt │  │ • Rebalancing History   │  │ │
│  │  │  │ • ADD_COLLATERAL│  │                 │  │                         │  │ │
│  │  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │ │
│  │  └─────────────────────────────────────────────────────────────────────────┘ │
│  └─────────────────────────────────────────────────────────────────────────────┘
```

### TypeScript Interface

```typescript
interface VaultContract {
  // User Operations
  deposit(token: string, amount: bigint): Promise<void>;
  withdraw(token: string, amount: bigint): Promise<void>;
  
  // Bot Operations (yield management)
  yield(targetProtocol: string, callParams: string, reason: string): Promise<void>;
  unyield(targetProtocol: string, callParams: string): Promise<void>;
  
  // Protocol Approvals (Bot only)
  approveTokenForProtocol(token: string, protocolSpender: string, amount: bigint): Promise<void>;
  
  // View Functions
  userAddress(): Promise<string>;
  botAddress(): Promise<string>;
  adminAddress(): Promise<string>;
  vaultCreator(): Promise<string>;
}
```

### Vault Lifecycle

1. **Creation**: Web app calls VaultCreator, bot address creates vault for user
2. **Deposit**: User deposits tokens (FRAX, USDC, etc.) directly to vault via `deposit(token, amount)`
3. **Bot Approval**: Bot calls `approveTokenForProtocol(token, protocolSpender, amount)` to approve Fraxlend pair for spending
4. **Investment**: Bot calls `yield(targetProtocol, callParams, reason)` to start earning on optimal Fraxlend pair
5. **Rebalancing**: Bot calls `unyield()` → executes swap via Odos → calls `yield()` with new optimal pair
6. **Withdrawal**: User calls `withdraw(token, amount)`, bot ensures liquidity by calling `unyield()` if needed
7. **Emergency**: Admin can directly access and recover funds, User can request `unyield()` through bot to pause earning

### Key Implementation Details

- **Fund Custody**: Bot never transfers user funds to itself, only manages them through vault contract methods
- **Protocol Integration**: Bot uses `yield()`/`unyield()` with encoded `callParams` for Fraxlend operations  
- **Rebalancing Strategy**: Move all funds to highest APR Fraxlend pair (simple strategy for initial implementation)
- **Emergency Access**: Admin has direct vault access for fund recovery, Users can pause earning anytime

## 🤖 Brain Vault Agent Architecture

### Core Agent Implementation

```typescript
// src/agents/brain-vault-agent.ts
export class BrainVaultAgent extends Agent {
  private fraxlendMcp: McpToolset;
  private odosMcp: McpToolset;
  private dbService: BrainVaultDbService;
  private vaultService: VaultManagementService;
  
  constructor(config: BrainVaultConfig) {
    super({
      name: "brain_vault_agent",
      model: "gemini-2.0-flash",
      description: "Autonomous yield optimization for Brain Vault using Fraxlend pairs",
      instructions: this.buildInstructions(),
      maxToolExecutionSteps: 15,
    });
  }
  
  private buildInstructions(): string {
    return `
    You are the Brain Vault Agent responsible for autonomous yield optimization.
    
    Your objectives:
    1. Monitor vault records from database for rebalancing opportunities
    2. Analyze Fraxlend pairs using FRAXLEND_GET_STATS for optimal yield
    3. Execute vault operations using yield()/unyield() methods with encoded callParams
    4. Coordinate token swaps via Odos when rebalancing between different tokens
    5. Handle fallback scenarios when primary operations fail
    
    Decision Process:
    1. Query database for vaults due for rebalancing
    2. Use FRAXLEND_GET_STATS to get current APR, utilization, and supply data
    3. Identify highest APR Fraxlend pair (simple strategy)
    4. If rebalancing needed: unyield() → swap via Odos (if different token) → yield() with new pair
    5. Update database with new allocation and performance data
    
    Vault Integration:
    - Use yield(targetProtocol, callParams, reason) to start earning
    - Use unyield(targetProtocol, callParams) to stop earning and withdraw
    - Use approveTokenForProtocol() to approve spending for new protocols
    - Never transfer funds to bot wallet - all operations through vault methods
    
    Risk Management:
    - Respect user-defined slippage tolerances (default 5%)
    - Consider gas costs vs potential yield improvements
    - Ensure sufficient liquidity before large position changes
    - Move all funds to highest APR pair (no diversification in MVP)
    `;
  }
}
```

### LangGraph Rebalancing Workflow

```typescript
// src/agents/brain-vault-langgraph-agent.ts
export class BrainVaultLangGraphAgent extends LangGraphAgent {
  constructor() {
    super({
      name: "brain_vault_rebalancing_workflow",
      description: "Multi-step autonomous rebalancing with fallback handling",
      nodes: [
        {
          name: "vault_data_collection",
          agent: new VaultDataCollectionAgent(),
          targets: ["fraxlend_analysis"]
        },
        {
          name: "fraxlend_analysis", 
          agent: new FraxlendAnalysisAgent(),
          targets: ["rebalancing_decision"],
          condition: (result) => result.content.includes("ANALYSIS_COMPLETE")
        },
        {
          name: "rebalancing_decision",
          agent: new RebalancingDecisionAgent(),
          targets: ["position_exit", "skip_rebalancing"],
          condition: (result) => result.content.includes("REBALANCING_RECOMMENDED")
        },
        {
          name: "position_exit",
          agent: new PositionExitAgent(), // unyield current position
          targets: ["token_swap"]
        },
        {
          name: "token_swap",
          agent: new TokenSwapAgent(), // Odos swap execution
          targets: ["position_entry", "fallback_swap"],
          condition: (result) => result.content.includes("SWAP_SUCCESSFUL")
        },
        {
          name: "fallback_swap",
          agent: new FallbackSwapAgent(), // Handle swap failures
          targets: ["position_entry"]
        },
        {
          name: "position_entry",
          agent: new PositionEntryAgent(), // yield in new pair
          targets: ["completion"]
        },
        {
          name: "skip_rebalancing",
          agent: new SkipRebalancingAgent(),
          targets: ["completion"]
        },
        {
          name: "completion",
          agent: new RebalancingCompletionAgent() // Update DB, log results
        }
      ],
      rootNode: "vault_data_collection",
      maxSteps: 25
    });
  }
}
```

## 📊 Database Schema & Services

### Vault Records Schema

```typescript
// src/models/brain-vault-schema.ts
export const vaultRecordsSchema = pgTable("vault_records", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  userAddress: varchar("user_address", { length: 42 }).notNull(),
  vaultAddress: varchar("vault_address", { length: 42 }).notNull(),
  
  // Investment Configuration
  baseToken: varchar("base_token", { length: 10 }).notNull(), // FRAX_USD
  rebalanceFrequency: varchar("rebalance_frequency", { length: 20 }).notNull(), // daily, weekly, bi-weekly
  slippageTolerance: decimal("slippage_tolerance").default("0.05"), // 5% default
  minRebalanceAmount: decimal("min_rebalance_amount").default("100"), // $100 minimum
  
  // Current State
  currentPair: varchar("current_fraxlend_pair", { length: 100 }),
  totalDeposited: decimal("total_deposited").notNull(),
  currentValue: decimal("current_value"),
  yieldingAmount: decimal("yielding_amount").default("0"),
  
  // Rebalancing Schedule
  lastRebalancingTimestamp: timestamp("last_rebalancing_timestamp"),
  nextRebalancingDue: timestamp("next_rebalancing_due").notNull(),
  
  // Performance Tracking
  totalYieldEarned: decimal("total_yield_earned").default("0"),
  rebalancingCount: integer("rebalancing_count").default(0),
  
  // Status & Control
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, paused, error
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const rebalancingHistorySchema = pgTable("rebalancing_history", {
  id: varchar("id", { length: 255 }).primaryKey(),
  vaultId: varchar("vault_id", { length: 255 }).notNull(),
  
  // Rebalancing Details
  fromPair: varchar("from_pair", { length: 100 }),
  toPair: varchar("to_pair", { length: 100 }).notNull(),
  amountProcessed: decimal("amount_processed").notNull(),
  
  // Execution Data
  swapDetails: jsonb("swap_details").$type<{
    inputToken: string;
    outputToken: string;
    inputAmount: string;
    outputAmount: string;
    slippage: number;
    gasUsed: string;
  }>(),
  
  // Performance Impact
  oldAPR: decimal("old_apr"),
  newAPR: decimal("new_apr").notNull(),
  expectedYieldImprovement: decimal("expected_yield_improvement"),
  
  // Execution Status
  status: varchar("status", { length: 20 }).notNull(), // success, failed, partial
  errorDetails: text("error_details"),
  
  executedAt: timestamp("executed_at").defaultNow().notNull(),
});
```

### Database Service Implementation

```typescript
// src/services/brain-vault-db-service.ts
export class BrainVaultDbService {
  constructor(private db: NodePgDatabase) {}
  
  // Get vaults due for rebalancing
  async getVaultsDueForRebalancing(): Promise<VaultRecord[]> {
    return await this.db
      .select()
      .from(vaultRecordsSchema)
      .where(
        and(
          eq(vaultRecordsSchema.status, "active"),
          lte(vaultRecordsSchema.nextRebalancingDue, new Date())
        )
      );
  }
  
  // Update vault after successful rebalancing
  async updateVaultAfterRebalancing(
    vaultId: string,
    rebalancingResult: RebalancingResult
  ): Promise<void> {
    const nextDue = this.calculateNextRebalancingDate(
      rebalancingResult.frequency
    );
    
    await this.db.transaction(async (tx) => {
      // Update vault record
      await tx
        .update(vaultRecordsSchema)
        .set({
          currentPair: rebalancingResult.newPair,
          currentValue: rebalancingResult.newValue,
          yieldingAmount: rebalancingResult.yieldingAmount,
          lastRebalancingTimestamp: new Date(),
          nextRebalancingDue: nextDue,
          rebalancingCount: sql`${vaultRecordsSchema.rebalancingCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(vaultRecordsSchema.id, vaultId));
      
      // Record rebalancing history
      await tx.insert(rebalancingHistorySchema).values({
        id: `rebal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        vaultId: vaultId,
        fromPair: rebalancingResult.oldPair,
        toPair: rebalancingResult.newPair,
        amountProcessed: rebalancingResult.amountProcessed,
        swapDetails: rebalancingResult.swapDetails,
        oldAPR: rebalancingResult.oldAPR,
        newAPR: rebalancingResult.newAPR,
        expectedYieldImprovement: rebalancingResult.expectedImprovement,
        status: "success"
      });
    });
  }
  
  private calculateNextRebalancingDate(frequency: string): Date {
    const now = new Date();
    switch (frequency) {
      case "daily":
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case "weekly":
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case "bi-weekly": 
        return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      default:
        throw new Error(`Invalid frequency: ${frequency}`);
    }
  }
}
```

## 🔗 MCP Integration Strategy

### Fraxlend MCP Service

```typescript
// src/services/fraxlend-mcp-service.ts
export class FraxlendMcpService {
  private toolset: McpToolset;
  
  async initialize(): Promise<void> {
    this.toolset = new McpToolset({
      name: "Fraxlend Protocol Client",
      description: "Integration with Fraxlend lending protocol",
      transport: {
        mode: "stdio",
        command: "npx",
        args: ["@iqai/mcp-fraxlend"],
        env: {
          WALLET_PRIVATE_KEY: process.env.WALLET_PRIVATE_KEY,
          PATH: process.env.PATH || "",
        }
      }
    });
    
    await this.toolset.initialize();
  }
  
  // Get all available Fraxlend pairs with stats
  async getAllPairStats(): Promise<FraxlendPairStats[]> {
    const result = await this.toolset.executeTool("FRAXLEND_GET_STATS", {});
    return this.parsePairStats(result);
  }
  
  // Get current positions for bot wallet
  async getBotPositions(): Promise<FraxlendPosition[]> {
    const result = await this.toolset.executeTool("FRAXLEND_GET_POSITIONS", {});
    return this.parsePositions(result);
  }
  
  // Execute lending operation
  async lendToPool(pairAddress: string, amount: string): Promise<string> {
    return await this.toolset.executeTool("FRAXLEND_LEND", {
      pair_address: pairAddress,
      amount: amount
    });
  }
  
  // Calculate optimal pair based on risk-adjusted returns
  calculateOptimalPair(
    pairStats: FraxlendPairStats[],
    riskTolerance: number = 0.7
  ): FraxlendPairStats {
    return pairStats
      .filter(pair => pair.utilization < 0.9) // Avoid over-utilized pairs
      .sort((a, b) => {
        const scoreA = a.apr * (1 - a.utilization * riskTolerance);
        const scoreB = b.apr * (1 - b.utilization * riskTolerance);
        return scoreB - scoreA;
      })[0];
  }
}
```

### Odos MCP Service

```typescript
// src/services/odos-mcp-service.ts
export class OdosMcpService {
  private toolset: McpToolset;
  
  async initialize(): Promise<void> {
    this.toolset = new McpToolset({
      name: "Odos DEX Aggregator",
      description: "Integration with Odos for optimal token swaps",
      transport: {
        mode: "stdio", 
        command: "npx",
        args: ["@iqai/mcp-odos"],
        env: {
          ODOS_API_KEY: process.env.ODOS_API_KEY,
          PATH: process.env.PATH || "",
        }
      }
    });
    
    await this.toolset.initialize();
  }
  
  // Get swap quote with slippage protection
  async getSwapQuote(
    inputToken: string,
    outputToken: string,
    amount: string,
    slippageTolerance: number = 0.05
  ): Promise<SwapQuote> {
    const result = await this.toolset.executeTool("ODOS_GET_QUOTE", {
      input_token: inputToken,
      output_token: outputToken,
      amount: amount,
      slippage: slippageTolerance
    });
    
    return this.parseSwapQuote(result);
  }
  
  // Execute swap with fallback handling
  async executeSwap(
    quote: SwapQuote,
    fallbackOptions?: SwapFallbackOptions
  ): Promise<SwapResult> {
    try {
      const result = await this.toolset.executeTool("ODOS_EXECUTE_SWAP", {
        quote_id: quote.id,
        max_slippage: quote.slippageTolerance
      });
      
      return {
        success: true,
        transactionHash: result.txHash,
        actualSlippage: result.slippage,
        outputAmount: result.outputAmount
      };
      
    } catch (error) {
      if (fallbackOptions?.enabled) {
        return await this.executeFallbackSwap(quote, fallbackOptions);
      }
      throw error;
    }
  }
  
  private async executeFallbackSwap(
    originalQuote: SwapQuote,
    fallbackOptions: SwapFallbackOptions
  ): Promise<SwapResult> {
    // Implement fallback logic: higher slippage, different route, etc.
    const fallbackQuote = await this.getSwapQuote(
      originalQuote.inputToken,
      originalQuote.outputToken,
      originalQuote.inputAmount,
      fallbackOptions.maxSlippage
    );
    
    return await this.executeSwap(fallbackQuote);
  }
}
```

## 🎯 Workflow Agent Implementations

### Vault Data Collection Agent

```typescript
// src/agents/workflow/vault-data-collection-agent.ts
export class VaultDataCollectionAgent extends Agent {
  constructor() {
    super({
      name: "vault_data_collector",
      model: "gemini-2.0-flash",
      description: "Collects vault information and current positions",
      instructions: `
        Collect comprehensive vault data for rebalancing analysis:
        
        1. Query database for vaults due for rebalancing
        2. Get current Fraxlend positions using FRAXLEND_GET_POSITIONS
        3. Retrieve vault contract balances (yielding vs idle)
        4. Gather user preferences (slippage tolerance, rebalancing frequency)
        
        Respond with 'ANALYSIS_COMPLETE' when all data is collected.
      `
    });
  }
}
```

### Fraxlend Analysis Agent

```typescript
// src/agents/workflow/fraxlend-analysis-agent.ts
export class FraxlendAnalysisAgent extends Agent {
  constructor() {
    super({
      name: "fraxlend_analyzer",
      model: "gemini-2.0-flash",
      description: "Analyzes Fraxlend pairs for optimal yield opportunities",
      instructions: `
        Analyze Fraxlend market data for rebalancing opportunities:
        
        1. Use FRAXLEND_GET_STATS to get current APR, utilization, and supply for all pairs
        2. Calculate risk-adjusted returns (APR adjusted for utilization risk)
        3. Compare current pair performance vs alternatives
        4. Consider total supply and liquidity constraints
        5. Factor in gas costs vs potential yield improvements
        
        Decision criteria:
        - Minimum 2% APR improvement to justify rebalancing
        - Avoid pairs with >90% utilization (liquidity risk)
        - Prefer pairs with >$1M total supply (stability)
        
        Respond with 'DECISION_READY' when analysis is complete.
      `
    });
  }
}
```

### Rebalancing Decision Agent

```typescript
// src/agents/workflow/rebalancing-decision-agent.ts
export class RebalancingDecisionAgent extends Agent {
  constructor() {
    super({
      name: "rebalancing_decision_maker",
      model: "gemini-2.0-flash",
      description: "Makes final decision on whether to rebalance positions",
      instructions: `
        Make the final rebalancing decision based on analysis:
        
        Evaluation criteria:
        1. Yield improvement > 2% APR threshold
        2. Target pair has sufficient liquidity
        3. Gas costs < 0.5% of vault value
        4. User slippage tolerance can be respected
        5. No recent rebalancing (minimum 24h cooldown)
        
        Risk checks:
        - Verify target pair is not over-utilized
        - Ensure swap route exists with acceptable slippage
        - Confirm vault has sufficient balance for rebalancing
        
        Respond with:
        - 'REBALANCING_RECOMMENDED' if conditions are met
        - 'SKIP_REBALANCING' if conditions are not favorable
        
        Include reasoning for the decision.
      `
    });
  }
}
```

## 🚀 Main Application Implementation

### Brain Vault Application

```typescript
// src/brain-vault-app.ts
export interface BrainVaultAppConfig {
  database: {
    connectionString: string;
  };
  blockchain: {
    rpcUrl: string;
    botPrivateKey: string;
    vaultCreatorAddress: string;
  };
  mcp: {
    fraxlendEnabled: boolean;
    odosEnabled: boolean;
  };
  rebalancing: {
    checkInterval: string; // cron format
    defaultSlippage: number;
    minYieldImprovement: number;
  };
  logging: {
    discordWebhook?: string;
    telegramBot?: string;
  };
}

export class BrainVaultApp {
  private dbService: BrainVaultDbService;
  private fraxlendService: FraxlendMcpService;
  private odosService: OdosMcpService;
  private vaultService: VaultManagementService;
  private scheduler: NodeCron.ScheduledTask;
  
  constructor(private config: BrainVaultAppConfig) {
    this.initializeServices();
  }
  
  async start(): Promise<void> {
    console.log("🧠 Starting Brain Vault Agent...");
    
    try {
      // Initialize database connection
      await this.dbService.initialize();
      console.log("📊 Database connected");
      
      // Initialize MCP services
      await this.fraxlendService.initialize();
      await this.odosService.initialize();
      console.log("🔗 MCP services initialized");
      
      // Start rebalancing scheduler
      this.startRebalancingScheduler();
      console.log("⏰ Rebalancing scheduler started");
      
      console.log("✅ Brain Vault Agent is running!");
      
    } catch (error) {
      console.error("❌ Failed to start Brain Vault Agent:", error);
      throw error;
    }
  }
  
  private startRebalancingScheduler(): void {
    this.scheduler = cron.schedule(
      this.config.rebalancing.checkInterval,
      async () => {
        await this.executeRebalancingCycle();
      }
    );
  }
  
  private async executeRebalancingCycle(): Promise<void> {
    console.log("🔄 Starting rebalancing cycle...");
    
    try {
      const vaultsDue = await this.dbService.getVaultsDueForRebalancing();
      console.log(`📋 Found ${vaultsDue.length} vaults due for rebalancing`);
      
      for (const vault of vaultsDue) {
        await this.processVaultRebalancing(vault);
      }
      
    } catch (error) {
      console.error("❌ Rebalancing cycle failed:", error);
      await this.notifyError("Rebalancing cycle failed", error);
    }
  }
  
  private async processVaultRebalancing(vault: VaultRecord): Promise<void> {
    console.log(`🏦 Processing vault ${vault.id} for user ${vault.userAddress}`);
    
    try {
      // Create rebalancing agent for this vault
      const agent = new BrainVaultLangGraphAgent();
      
      // Add MCP tools
      const fraxlendTools = await this.fraxlendService.getTools();
      const odosTools = await this.odosService.getTools();
      agent.addTools([...fraxlendTools, ...odosTools]);
      
      // Execute rebalancing workflow
      const result = await agent.run({
        messages: [{
          role: "user",
          content: `Execute rebalancing analysis and potential rebalancing for vault:
          
          Vault ID: ${vault.id}
          User Address: ${vault.userAddress}
          Vault Address: ${vault.vaultAddress}
          Current Pair: ${vault.currentPair || 'None'}
          Total Deposited: ${vault.totalDeposited}
          Slippage Tolerance: ${vault.slippageTolerance}
          Rebalancing Frequency: ${vault.rebalanceFrequency}
          
          Analyze current Fraxlend opportunities and execute rebalancing if beneficial.`
        }]
      });
      
      console.log(`✅ Vault ${vault.id} rebalancing completed`);
      await this.notifySuccess(`Vault rebalancing completed for ${vault.userAddress}`);
      
    } catch (error) {
      console.error(`❌ Vault ${vault.id} rebalancing failed:`, error);
      await this.dbService.updateVaultStatus(vault.id, "error", error.message);
      await this.notifyError(`Vault rebalancing failed for ${vault.userAddress}`, error);
    }
  }
  
  async stop(): Promise<void> {
    console.log("🛑 Stopping Brain Vault Agent...");
    
    if (this.scheduler) {
      this.scheduler.stop();
    }
    
    await this.fraxlendService.cleanup();
    await this.odosService.cleanup();
    
    console.log("✅ Brain Vault Agent stopped");
  }
  
  private async notifySuccess(message: string): Promise<void> {
    // Implement Discord/Telegram notifications
    console.log("🎉", message);
  }
  
  private async notifyError(message: string, error: Error): Promise<void> {
    // Implement Discord/Telegram error notifications
    console.error("🚨", message, error);
  }
}
```

## 📋 Implementation Roadmap

### **Phase 1: Core Infrastructure**

```bash
✅ Database schema and services
✅ MCP integration (Fraxlend + Odos)
✅ Basic vault contract interface
✅ Core agent framework
✅ LangGraph workflow setup
```

### **Phase 2: Investment Logic**

```bash
🔨 Fraxlend pair analysis and selection
🔨 Odos swap execution with fallbacks
🔨 Vault yield/unyield management
🔨 Rebalancing decision engine
🔨 Error handling and recovery
```

### **Phase 3: Production Features*

```bash
🔨 Comprehensive logging and monitoring
🔨 Discord/Telegram notifications
🔨 Performance analytics and reporting
🔨 Emergency pause mechanisms
🔨 Multi-vault batch processing
```

### **Phase 4: Advanced Features**

```bash
🔨 Dynamic slippage management
🔨 Gas optimization strategies
🔨 Advanced risk management
🔨 Historical performance tracking
🔨 User preference management
```

## 🔧 Environment Configuration

### Required Environment Variables

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/brain_vault

# Blockchain Configuration
RPC_URL=https://fraxtal-rpc.example.com
WALLET_PRIVATE_KEY=0x1234567890abcdef...
VAULT_CREATOR_ADDRESS=0xabcdef1234567890...

# MCP Configuration
ODOS_API_KEY=your-odos-api-key

# Agent Configuration
LLM_MODEL=gemini-2.0-flash
DEFAULT_SLIPPAGE_TOLERANCE=0.05
MIN_YIELD_IMPROVEMENT=0.02
REBALANCING_CHECK_INTERVAL=0 */6 * * *  # Every 6 hours

# Monitoring
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-chat-id

# Development
DEBUG=true
LOG_LEVEL=debug
```

## ✅ Implementation Clarifications (Resolved)

### **A. Token Flow & Custody**

**Resolution**: Bot manages user tokens through vault contract methods only

- Bot never transfers vault tokens to itself
- Bot calls vault methods that directly interact with protocols via `yield()`/`unyield()`
- Bot gets approval to spend user funds through `approveTokenForProtocol()` method
- All funds remain in user's vault contract at all times

### **B. Rebalancing Strategy**

**Resolution**: Simple highest APR strategy for initial implementation

- Move all funds to the Fraxlend pair with highest APR
- Future iterations may include more sophisticated strategies
- Risk-adjusted returns and diversification to be added later

### **C. Multi-Chain Architecture**

**Resolution**: Fraxtal chain only for initial implementation

- Single-chain deployment focused on Fraxtal
- Multi-chain expansion deferred to future phases
- No cross-chain bridging required initially

### **D. Risk Parameters**

**Resolution**: Basic risk management for MVP

- Risk parameters need further discussion and definition
- Default slippage tolerance: 5% (configurable per user)
- Minimum vault value for rebalancing: $100
- Gas cost considerations vs yield improvement analysis

### **E. Error Recovery**

**Resolution**: Admin-controlled recovery with user pause capability

- Admin has direct access to all vault funds for emergency recovery
- Bot implements retry logic for failed operations
- Users can call `unyield()` through bot interface to pause earning anytime
- Partial failure handling: rollback incomplete operations

### **F. User Control**

**Resolution**: Basic user controls through bot interface

- Users can pause/resume by requesting `unyield()` through bot
- Rebalancing frequency configurable (daily/weekly/bi-weekly)
- Custom slippage tolerance settings per user
- Vault settings managed through web app interface

### **G. Gas Optimization**

**Resolution**: Standard single-transaction approach initially  

- No batching for MVP implementation
- Gas costs factored into rebalancing decision logic
- Future optimization for batch operations when beneficial

## 🎯 Success Metrics

### **Technical KPIs**

- Rebalancing execution success rate > 95%
- Average rebalancing completion time < 5 minutes
- System uptime > 99.5%
- Error recovery rate > 90%

### **Business KPIs**

- Average yield improvement per rebalancing > 2%
- User vault value growth over time
- Total value locked (TVL) growth
- User retention and satisfaction

### **Risk Management KPIs**

- Slippage stays within user tolerance 98% of time
- Zero vault fund losses due to bot errors
- Maximum downtime < 4 hours per month
- All transactions properly logged and auditable

## 📋 Contract Integration

### VaultCreator Contract

See: [`@abi/vault-creator.abi.ts`](./abi/vault-creator.abi.ts)

**Key Responsibilities:**

- **Admin**: Controls protocol whitelisting (`whitelistProtocol`, `unwhitelistProtocol`)
- **Bot**: Creates vaults for users (`createVault` - only bot address allowed)
- **Users**: Interact via web app for deposits and configuration

## 🏦 Individual Vault Contracts

### Contract ABI Reference

See: [`@abi/vault.abi.ts`](./abi/vault.abi.ts)

### TypeScript Interface

```typescript
interface VaultContract {
  // User Operations
  deposit(token: string, amount: bigint): Promise<void>;
  withdraw(token: string, amount: bigint): Promise<void>;
  
  // Bot Operations (yield management)
  yield(targetProtocol: string, callParams: string, reason: string): Promise<void>;
  unyield(targetProtocol: string, callParams: string): Promise<void>;
  
  // Protocol Approvals (Bot only)
  approveTokenForProtocol(token: string, protocolSpender: string, amount: bigint): Promise<void>;
  
  // View Functions
  userAddress(): Promise<string>;
  botAddress(): Promise<string>;
  adminAddress(): Promise<string>;
  vaultCreator(): Promise<string>;
}
```
