import { AgentBuilder } from "@iqai/adk";
import { getCustomerAnalyzerAgent } from "./customer-analyzer/agent";
import { getMenuValidatorAgent } from "./menu-validator/agent";
import { getOrderFinalizerAgent } from "./order-finalizer/agent";

export function getRootAgent() {
	const customerAnalyzer = getCustomerAnalyzerAgent();
	const menuValidator = getMenuValidatorAgent();
	const orderFinalizer = getOrderFinalizerAgent();

	const initialState = {
		customer_preferences: "",
		menu_validation: "",
	};

	return AgentBuilder.create("restaurant_order_system")
		.withModel(process.env.LLM_MODEL || "gemini-3-flash-preview")
		.withSubAgents([customerAnalyzer, menuValidator, orderFinalizer])
		.withQuickSession({ state: initialState })
		.build();
}
