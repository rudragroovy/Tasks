# Exercise 1: Rewrite Bad Prompts into Effective Prompts

## Objective

Improve prompt quality by converting vague prompts into clear, specific, and actionable prompts.

| Bad Prompt                     | Effective Prompt                                                                                                                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Write about AI.                | Write a 300-word beginner-friendly article explaining Artificial Intelligence, its applications, benefits, and challenges. Use simple language and include 3 real-world examples. |
| Explain Python.                | Explain Python programming for a second-year computer science student. Cover syntax, key features, and common use cases with code examples.                                       |
| Make a website.                | Create a responsive landing page for a food delivery startup using HTML, CSS, and JavaScript. Include a hero section, features, testimonials, and CTA button.                     |
| Help me study DBMS.            | Create a DBMS revision guide covering normalization, transactions, indexing, joins, and ACID properties with examples.                                                            |
| Improve my resume.             | Review my software engineering resume and suggest improvements in formatting, ATS optimization, project descriptions, and skills presentation.                                    |
| Give me project ideas.         | Suggest 10 MERN stack project ideas suitable for a final-year student, including difficulty level and key technologies.                                                           |
| Write code.                    | Write a Python program to implement binary search with comments, complexity analysis, and sample input/output.                                                                    |
| Tell me about cloud computing. | Explain cloud computing in 500 words, covering IaaS, PaaS, SaaS, advantages, disadvantages, and examples.                                                                         |
| Create interview questions.    | Generate 20 technical interview questions on JavaScript, categorized by beginner, intermediate, and advanced levels.                                                              |
| Summarize this document.       | Summarize the document in under 200 words, highlighting key findings, recommendations, and important conclusions.                                                                 |

## Key Learnings

* Specific prompts produce better outputs.
* Clearly defining format and audience improves response quality.
* Providing context reduces ambiguity.
* Structured instructions improve consistency.

## Prompt Outputs

### 1. Artificial Intelligence

**Bad Prompt:** `Write about AI.`

**Output:**
> Artificial Intelligence (AI) is a branch of computer science that focuses on creating systems capable of performing tasks that normally require human intelligence. These tasks include learning, reasoning, problem-solving, decision-making, understanding language, recognizing images, and adapting to new situations.
> 
> AI systems work by analyzing large amounts of data, identifying patterns, and using those patterns to make predictions or decisions. Modern AI is powered by technologies such as Machine Learning (ML), Deep Learning, Natural Language Processing (NLP), and Computer Vision.
> 
> Some common applications of AI include:
> 
> * Virtual assistants like Siri and Google Assistant
> * Recommendation systems used by Netflix and YouTube
> * Self-driving vehicles
> * Fraud detection in banking
> * Medical diagnosis and healthcare support
> * Chatbots and customer service automation
> * Language translation and speech recognition
> 
> AI can be categorized into:
> 
> * Narrow AI (Weak AI): Designed for specific tasks, such as facial recognition or voice assistants.
> * General AI (Strong AI): A theoretical form of AI that can perform any intellectual task a human can do.
> * Super AI: A hypothetical future AI that surpasses human intelligence.
> 
> AI offers many benefits, including increased efficiency, automation of repetitive tasks, improved decision-making, and enhanced user experiences. However, it also raises concerns related to privacy, job displacement, bias in algorithms, and ethical use.
> 
> Today, AI is transforming industries such as healthcare, education, finance, transportation, and entertainment, making it one of the most influential technologies of the 21st century.

**Effective Prompt:** `Write a 300-word beginner-friendly article explaining Artificial Intelligence, its applications, benefits, and challenges. Use simple language and include 3 real-world examples.`

**Output:**
> # Artificial Intelligence: A Beginner's Guide
> 
> Artificial Intelligence (AI) is a technology that enables computers and machines to perform tasks that usually require human intelligence. These tasks include learning from data, understanding language, recognizing images, solving problems, and making decisions. AI systems are designed to analyze information, identify patterns, and improve their performance over time.
> 
> Today, AI is becoming an important part of our daily lives. One common example is virtual assistants such as Siri and Google Assistant, which can answer questions, set reminders, and perform tasks using voice commands. Another example is recommendation systems used by Netflix and YouTube, which suggest movies and videos based on a user's preferences. A third example is navigation apps like Google Maps, which use AI to predict traffic conditions and recommend the fastest routes.
> 
> AI offers several benefits. It can automate repetitive tasks, saving time and increasing productivity. In healthcare, AI helps doctors analyze medical data and detect diseases more accurately. Businesses use AI to improve customer service through chatbots and personalized recommendations. AI can also process large amounts of data much faster than humans, helping organizations make better decisions.
> 
> However, AI also presents some challenges. One concern is job displacement, as automation may reduce the need for certain types of work. Privacy is another issue because AI systems often rely on large amounts of personal data. Additionally, AI can sometimes produce biased results if it is trained on incomplete or unfair data. Ensuring the ethical and responsible use of AI is therefore very important.
> 
> In conclusion, Artificial Intelligence is a powerful technology that is transforming many aspects of modern life. While it offers significant benefits, it also requires careful management to address its challenges. Understanding AI is becoming increasingly important as its influence continues to grow across different industries and everyday activities.

---

### 2. Python Programming

**Bad Prompt:** `Explain Python.`

**Output:**
> Python is a **high-level, interpreted programming language** known for its simple and readable syntax. It is widely used for:
> 
> * 🌐 **Web development** (e.g., with frameworks like Django and Flask)
> * 📊 **Data analysis and visualization**
> * 🤖 **Artificial Intelligence and Machine Learning**
> * 🔬 **Scientific computing**
> * 🛠️ **Automation and scripting**
> * 🎮 **Game development**
> 
> #### Example: Hello World
> 
> ```python
> print("Hello, World!")
> ```
> 
> Output:
> 
> ```
> Hello, World!
> ```
> 
> #### Variables
> 
> ```python
> name = "Alice"
> age = 25
> 
> print(name)
> print(age)
> ```
> 
> #### Conditional Statements
> 
> ```python
> age = 18
> 
> if age >= 18:
>     print("Adult")
> else:
>     print("Minor")
> ```
> 
> #### Loops
> 
> ```python
> for i in range(5):
>     print(i)
> ```
> 
> Output:
> 
> ```
> 0
> 1
> 2
> 3
> 4
> ```
> 
> #### Functions
> 
> ```python
> def greet(name):
>     return f"Hello, {name}!"
> 
> print(greet("Alice"))
> ```
> 
> #### Why Python is Popular
> 
> 1. Easy to learn and read.
> 2. Large standard library.
> 3. Huge community support.
> 4. Works on Windows, macOS, and Linux.
> 5. Excellent ecosystem for AI, data science, and automation.
> 
> In simple terms, Python lets you write powerful programs with relatively little code, making it one of the best languages for beginners and professionals alike.

**Effective Prompt:** `Explain Python programming for a second-year computer science student. Cover syntax, key features, and common use cases with code examples.`

**Output:**
> # Python Programming: A Guide for Second-Year Computer Science Students
> 
> ## Introduction
> 
> Python is a **high-level, interpreted, object-oriented programming language** developed by Guido van Rossum and first released in 1991. It is known for its simple syntax, readability, and versatility, making it one of the most popular programming languages in academia and industry.
> 
> Python follows the principle of **"write less, do more"**, allowing developers to create applications with fewer lines of code compared to many other languages.
> 
> ---
> 
> ## Key Features of Python
> 
> ### 1. Easy-to-Read Syntax
> 
> Python uses indentation instead of braces (`{}`) to define code blocks.
> 
> ```python
> if 10 > 5:
>     print("10 is greater than 5")
> ```
> 
> ### 2. Interpreted Language
> 
> Python code is executed line by line by an interpreter, eliminating the need for compilation.
> 
> ### 3. Object-Oriented
> 
> Python supports classes, objects, inheritance, polymorphism, and encapsulation.
> 
> ### 4. Cross-Platform
> 
> Python programs run on Windows, Linux, and macOS with minimal changes.
> 
> ### 5. Large Standard Library
> 
> Python includes built-in modules for file handling, networking, mathematics, databases, and more.
> 
> ### 6. Dynamic Typing
> 
> Variable types are determined automatically during execution.
> 
> ```python
> x = 10
> x = "Hello"
> ```
> 
> ---
> 
> ## Python Syntax Basics
> 
> ### Variables and Data Types
> 
> ```python
> name = "Rudra"
> age = 20
> cgpa = 8.5
> is_student = True
> ```
> 
> #### Common Data Types
> 
> | Data Type | Example          |
> | --------- | ---------------- |
> | int       | 10               |
> | float     | 3.14             |
> | str       | "Python"         |
> | bool      | True             |
> | list      | [1,2,3]          |
> | tuple     | (1,2,3)          |
> | set       | {1,2,3}          |
> | dict      | {"name":"Rudra"} |
> 
> ---
> 
> ## Input and Output
> 
> ```python
> name = input("Enter your name: ")
> print("Hello", name)
> ```
> 
> ---
> 
> ## Operators
> 
> ### Arithmetic Operators
> 
> ```python
> a = 10
> b = 3
> 
> print(a + b)
> print(a - b)
> print(a * b)
> print(a / b)
> print(a % b)
> ```
> 
> ### Comparison Operators
> 
> ```python
> print(a > b)
> print(a == b)
> print(a != b)
> ```
> 
> ### Logical Operators
> 
> ```python
> x = True
> y = False
> 
> print(x and y)
> print(x or y)
> print(not x)
> ```
> 
> ---
> 
> ## Conditional Statements
> 
> ### if Statement
> 
> ```python
> marks = 75
> 
> if marks >= 50:
>     print("Pass")
> ```
> 
> ### if-else Statement
> 
> ```python
> marks = 40
> 
> if marks >= 50:
>     print("Pass")
> else:
>     print("Fail")
> ```
> 
> ### if-elif-else Statement
> 
> ```python
> marks = 85
> 
> if marks >= 90:
>     print("Grade A")
> elif marks >= 75:
>     print("Grade B")
> else:
>     print("Grade C")
> ```
> 
> ---
> 
> ## Loops
> 
> ### for Loop
> 
> ```python
> for i in range(1, 6):
>     print(i)
> ```
> 
> Output:
> 
> ```
> 1
> 2
> 3
> 4
> 5
> ```
> 
> ### while Loop
> 
> ```python
> count = 1
> 
> while count <= 5:
>     print(count)
>     count += 1
> ```
> 
> ---
> 
> ## Functions
> 
> Functions help organize code into reusable blocks.
> 
> ```python
> def add(a, b):
>     return a + b
> 
> result = add(10, 20)
> print(result)
> ```
> 
> Output:
> 
> ```
> 30
> ```
> 
> ---
> 
> ## Lists
> 
> Lists store multiple values.
> 
> ```python
> fruits = ["Apple", "Banana", "Mango"]
> 
> print(fruits[0])
> 
> fruits.append("Orange")
> 
> print(fruits)
> ```
> 
> ---
> 
> ## Tuples
> 
> Tuples are immutable collections.
> 
> ```python
> coordinates = (10, 20)
> 
> print(coordinates[0])
> ```
> 
> ---
> 
> ## Dictionaries
> 
> Store data as key-value pairs.
> 
> ```python
> student = {
>     "name": "Rudra",
>     "age": 20,
>     "cgpa": 8.5
> }
> 
> print(student["name"])
> ```
> 
> ---
> 
> ## Object-Oriented Programming in Python
> 
> ### Class and Object
> 
> ```python
> class Student:
>     def __init__(self, name):
>         self.name = name
> 
>     def display(self):
>         print("Student Name:", self.name)
> 
> s1 = Student("Rudra")
> s1.display()
> ```
> 
> Output:
> 
> ```
> Student Name: Rudra
> ```
> 
> ---
> 
> ## File Handling
> 
> ### Writing to a File
> 
> ```python
> file = open("sample.txt", "w")
> file.write("Hello Python")
> file.close()
> ```
> 
> ### Reading from a File
> 
> ```python
> file = open("sample.txt", "r")
> print(file.read())
> file.close()
> ```
> 
> ---
> 
> ## Exception Handling
> 
> Used to manage runtime errors gracefully.
> 
> ```python
> try:
>     num = int(input("Enter a number: "))
>     result = 10 / num
>     print(result)
> 
> except ZeroDivisionError:
>     print("Cannot divide by zero")
> 
> except ValueError:
>     print("Invalid input")
> ```
> 
> ---
> 
> ## Modules and Libraries
> 
> Python modules allow code reuse.
> 
> ```python
> import math
> 
> print(math.sqrt(25))
> ```
> 
> Output:
> 
> ```
> 5.0
> ```
> 
> ---
> 
> ## Common Use Cases of Python
> 
> #### 1. Web Development
> 
> Frameworks:
> 
> * Django
> * Flask
> * FastAPI
> 
> Example applications:
> 
> * E-commerce websites
> * Blogs
> * APIs
> 
> ---
> 
> #### 2. Data Science and Analytics
> 
> Libraries:
> 
> * NumPy
> * Pandas
> * Matplotlib
> 
> Example:
> 
> ```python
> import pandas as pd
> 
> data = {
>     "Name": ["A", "B", "C"],
>     "Marks": [85, 90, 78]
> }
> 
> df = pd.DataFrame(data)
> print(df)
> ```
> 
> ---
> 
> #### 3. Artificial Intelligence and Machine Learning
> 
> Libraries:
> 
> * TensorFlow
> * PyTorch
> * Scikit-learn
> 
> Applications:
> 
> * Chatbots
> * Recommendation systems
> * Image recognition
> 
> ---
> 
> #### 4. Automation and Scripting
> 
> Python automates repetitive tasks:
> 
> ```python
> import os
> 
> files = os.listdir()
> 
> for file in files:
>     print(file)
> ```
> 
> ---
> 
> #### 5. Cybersecurity and Networking
> 
> Python is used for:
> 
> * Network monitoring
> * Security testing
> * Packet analysis
> * Log processing
> 
> Libraries include:
> 
> * `socket`
> * `scapy`
> * `requests`
> 
> ---
> 
> ## Advantages of Python
> 
> ✅ Easy to learn and use
> ✅ Extensive library support
> ✅ Platform independent
> ✅ Strong community support
> ✅ Suitable for AI, web, and automation projects
> ✅ Rapid application development
> 
> ---
> 
> ## Limitations of Python
> 
> ❌ Slower than compiled languages like C++
> ❌ Higher memory consumption
> ❌ Not ideal for mobile app development
> ❌ Global Interpreter Lock (GIL) can limit some multithreaded applications
> 
> ---
> 
> ## Conclusion
> 
> Python is one of the most important programming languages for computer science students because it combines simplicity with powerful capabilities. Understanding Python fundamentals such as variables, data types, control structures, functions, object-oriented programming, file handling, and exception handling provides a strong foundation for advanced areas like web development, machine learning, data science, cloud computing, and automation. Mastering Python can significantly enhance problem-solving skills and prepare students for both academic projects and industry applications.
