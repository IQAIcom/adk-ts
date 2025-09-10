"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
	const { setTheme, theme } = useTheme();

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={() => setTheme(theme === "light" ? "dark" : "light")}
		>
			<Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
			<Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
			<span className="sr-only">Toggle theme</span>
		</Button>
	);
}

export function ThemeToggleDropdown() {
	const { setTheme } = useTheme();

	return (
		<div className="flex items-center space-x-2">
			<Button variant="ghost" size="sm" onClick={() => setTheme("light")}>
				<Sun className="h-4 w-4" />
				<span className="sr-only">Light</span>
			</Button>
			<Button variant="ghost" size="sm" onClick={() => setTheme("dark")}>
				<Moon className="h-4 w-4" />
				<span className="sr-only">Dark</span>
			</Button>
			<Button variant="ghost" size="sm" onClick={() => setTheme("system")}>
				<Monitor className="h-4 w-4" />
				<span className="sr-only">System</span>
			</Button>
		</div>
	);
}
