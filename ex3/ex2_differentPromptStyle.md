# Exercise 2: Comparing Different Prompting Styles

## Task

Create a 5-Day ReactJS Learning Plan.

---

## 1. Zero-Shot Prompt

### Prompt

Create a 5-day ReactJS learning plan.

### Output

Day 1: Introduction to React and JSX

Day 2: Components and Props

Day 3: State and Event Handling

Day 4: React Hooks

Day 5: Build a Simple React Project

### Observation

The output is short and direct. It provides a basic roadmap but lacks detailed explanations, resources, or practical guidance.

---

## 2. Role-Based Prompt

### Prompt

Act as a senior React developer and mentor.

Create a detailed 5-day ReactJS learning plan for a college student who already knows JavaScript.

### Output

Day 1:

* Understand React fundamentals
* Learn JSX syntax
* Create your first React application

Day 2:

* Learn Functional Components
* Understand Props
* Build reusable UI components

Day 3:

* Learn State Management
* Handle User Events
* Create a Counter Application

Day 4:

* Learn useState and useEffect Hooks
* Fetch API data
* Build a Weather App

Day 5:

* Create a Mini Project
* Deploy using Vercel
* Review React Interview Questions

### Observation

The output is more practical and tailored to a learner. It includes projects and real-world recommendations.

---

## 3. Chain-of-Thought Prompt

### Prompt

Think step-by-step while designing a learning path.

First identify prerequisites.

Then organize React topics from beginner to intermediate.

Finally create a 5-day study plan.

### Output

Prerequisites:

* HTML
* CSS
* JavaScript ES6

Day 1:

* React Overview
* JSX Basics

Day 2:

* Components
* Props

Day 3:

* State
* Event Handling

Day 4:

* Hooks (useState, useEffect)

Day 5:

* Build a CRUD Application

### Observation

The output follows a logical progression and ensures foundational concepts are covered before advanced topics.

---

## 4. Structured Output Prompt

### Prompt

Create a 5-day ReactJS study plan.

Return the response in the following format:

Day:
Topics:
Tasks:
Resources:

### Output

Day 1

Topics:

* React Basics
* JSX

Tasks:

* Install React
* Create First App

Resources:

* React Documentation

Day 2

Topics:

* Components
* Props

Tasks:

* Build Profile Card

Resources:

* React Learn Guide

Day 3

Topics:

* State
* Events

Tasks:

* Create Counter App

Resources:

* React State Documentation

Day 4

Topics:

* Hooks

Tasks:

* Build To-Do App

Resources:

* React Hooks Guide

Day 5

Topics:

* Project Development

Tasks:

* Build Expense Tracker

Resources:

* React Official Docs

### Observation

The output is highly organized and easy to follow. It is suitable for documentation and reporting.

---

## 5. Few-Shot Prompt

### Prompt

Example:

Input: Learn HTML in 3 Days

Output:

Day 1: HTML Structure

Day 2: Forms and Tables

Day 3: Mini Project

Example:

Input: Learn CSS in 3 Days

Output:

Day 1: Selectors

Day 2: Flexbox and Grid

Day 3: Responsive Design Project

Now create a 5-day ReactJS learning plan.

### Output

Day 1: React Introduction and JSX

Day 2: Components and Props

Day 3: State and Events

Day 4: Hooks and API Calls

Day 5: Build and Deploy a React Project

### Observation

The model follows the same pattern demonstrated in the examples and maintains a consistent format.

---

## Comparison Summary

| Style             | Output Quality | Best Use Case       |
| ----------------- | -------------- | ------------------- |
| Zero-Shot         | Basic          | Quick tasks         |
| Role-Based        | Detailed       | Expert guidance     |
| Chain-of-Thought  | Logical        | Learning paths      |
| Structured Output | Organized      | Documentation       |
| Few-Shot          | Consistent     | Pattern-based tasks |

## Conclusion

Different prompting techniques produce different levels of detail and structure. For learning plans, Role-Based and Structured Output prompts provide the most useful results, while Few-Shot prompting ensures consistent formatting.
