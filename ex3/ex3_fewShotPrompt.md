# Exercise 3: Few-Shot Prompting

## Objective

Create a few-shot prompt using three examples and verify whether the language model follows the intended pattern.

---

## Few-Shot Prompt

You are generating project summaries.

Example 1:

Project: Weather App

Summary: A web application that fetches and displays real-time weather data using APIs.

Example 2:

Project: Expense Tracker

Summary: A personal finance tool for tracking expenses, budgets, and spending trends.

Example 3:

Project: Library Management System

Summary: A software solution for managing books, borrowers, and circulation records.

Now generate a summary for:

Project: FoodBridge

---

## Model Output

FoodBridge:

An AI-powered platform that helps reduce food waste by predicting food safety, connecting donors with volunteers, and managing food distribution efficiently.

---

## Pattern Verification

The generated response follows the same pattern as the examples:

* Single concise sentence
* Starts with project purpose
* Highlights key functionality
* Maintains consistent tone and structure

---

## Result

The few-shot prompt successfully guided the model to produce a response matching the demonstrated examples. This confirms that few-shot prompting can improve consistency and output formatting by providing representative examples.
