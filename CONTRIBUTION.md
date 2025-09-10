
# 🤝 Contributing Guide for Agent Development Kit (ADK) for TypeScript

First of all, thank you for taking the time to contribute! 🎉

This guide will help you understand how to contribute to the ADK-TS project effectively. Whether you're reporting bugs, suggesting features, or contributing code, this document will provide you with the necessary steps and guidelines.

<span id="table-of-contents"></span>

## 🗂️ Table of Contents

- [Reporting Bugs](#reporting-bugs)
- [Suggesting Enhancements/Features](#suggesting-enhancementsfeatures)
- [Understanding the Project](#understanding-the-project)
  - [Prerequisite](#prerequisite)
  - [Project Structure](#project-structure)
- [Contributing to the Project](#contributing-to-the-project)
  - [Cloning the Repository](#cloning-the-repository-repo)
  - [Making your Changes](#making-your-changes)
  - [Opening a Pull Request](#opening-a-pull-request)
- [License](#license)
- [Security](#security)

The following is a set of guidelines for contributing to ADK-TS. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

Before contributing, we encourage you to read our [Code of Conduct](CODE_OF_CONDUCT.md).

<span id="reporting-bugs"></span>

## 💣 Reporting Bugs

This section guides you through submitting a bug report. Following these guidelines helps maintainers and the community understand your report, reproduce the behavior, and find related reports.

Before creating a new issue, **[check existing issues](https://github.com/IQAIcom/adk-ts/issues)** to see if the report exists. If it does, go through the discussion thread and leave a comment instead of opening a new one.

If you find a **Closed** issue that is the same as what you are experiencing, open a new issue and include a link to the original issue in the body of your new one.

If you cannot find an open or closed issue addressing the problem, [open a new issue](https://github.com/IQAIcom/adk-ts/issues).

Be sure to include a **clear title and description**, the **exact steps to reproduce the bug**, the **behavior you observed after following the steps**, and the **behavior you expected to see instead**. If possible, include a link to a **reproducible example** or a **code sample** that demonstrates the issue.

[🔝 Back to top](#table-of-contents)

<span id="suggesting-enhancementsfeatures"></span>

## 🛠 Suggesting Enhancements/Features

We track Enhancements and Feature Requests as GitHub issues.

Before submitting an enhancement/feature request, **[see if the issue already exists](https://github.com/IQAIcom/adk-ts/issues)**. If it does, go through the conversation thread to see if there is additional information and contribute to the conversation instead of opening a new one.

If you find a **Closed** issue, go through the conversation thread to see if the feature has already been implemented or rejected. If not, you can open a new issue.

A good Feature Request should have a **clear and descriptive title**, provide a **detailed description** of the request, and include reasons why the enhancement would be helpful to the project and the community.

[🔝 Back to top](#table-of-contents)

<span id="understanding-the-project"></span>

## ✨ Understanding the Project

Before contributing to the project, you need to understand the project structure and how it works. This section guides you through the project structure and how to run the project locally.

<span id="prerequisite"></span>

### Prerequisite

This project uses [pnpm](https://pnpm.io/) as its package manager. If you already have [Node.js](https://nodejs.org/en) installed, this is how you can install pnpm globally:

```bash
npm i -g pnpm
```

If you do not have Node.js installed, run the command:

```bash
npm install -g @pnpm/exe
```

<!-- > Note: For node 20.x upwards, some users have reported issues with pnpm. Check the [pnpm documentation](https://pnpm.io/installation#compatibility) for more information, including other ways to install pnpm. -->

<span id="project-structure"></span>

### Project Structure

ADK-TS uses a [monorepo](https://monorepo.tools/) structure organized as follows:

- `apps/` — Application projects and templates
  - `docs/` — Documentation site (Fumadocs)
  - `examples/` — Comprehensive usage examples
  - `starter-templates/` — Official starter templates
- `packages/` — Core libraries and tools
  - `adk/` — Main ADK TypeScript framework
  - `adk-cli/` — CLI for scaffolding new projects (install globally and use `adk`)
  - `tsconfig/` — Shared TypeScript configurations

[🔝 Back to top](#table-of-contents)

<span id="contributing-to-the-project"></span>

## 📝 Contributing to the Project

If you want to do more than report an issue or suggest an enhancement, you can contribute to the project by:

- cloning the repository (repo)
- making your changes
- opening a pull request

> Note: If you want to contribute to the core ADK-TS framework, please read about the [Framework Architecture](./ARCHITECTURE.md) first.

<span id="cloning-the-repository-repo"></span>

### Cloning the Repository (repo)

#### 1. Fork the repo

Click the fork button at the top right of the [project home page](https://github.com/IQAIcom/adk-ts) to create a copy of this repo in your account, or go to the [ADK-TS fork page](https://github.com/IQAIcom/adk-ts/fork).

After successfully forking the repo, you will be directed to your repo copy.

#### 2. Clone the forked repo

On your forked repo, click the green button that says `Code`. It will open a dropdown menu. Copy the link in the input with the label `HTTPS` or `GitHub CLI` depending on your preferred cloning mode.

For HTTPS, open up your terminal and run the following command:

```bash
git clone <your-clone-link>
# or
git clone https://github.com/<your-username>/adk-ts.git
```

Replace `<your-username>` with your GitHub username.

You can also clone the repo using the GitHub CLI. To do this, run the following command:

```bash
gh repo clone <your-username>/adk-ts
```

#### 3. Set up the project

To set up the project, navigate into the project directory and open up the project in your preferred code editor.

```bash
cd adk-ts
code . # Opens up the project in VSCode
```

Install the dependencies using pnpm. You need to have [pnpm](https://pnpm.io/) installed; see the [prerequisite](#prerequisite) section.

```bash
pnpm install
```

[🔝 Back to top](#table-of-contents)

<span id="making-your-changes"></span>

### Making your Changes

#### 1. Create a new branch

Create a new branch from the `main` branch. Your branch name should be descriptive of the changes you are making. E.g., `docs/updating-the-readme-file`. Some ideas to get you started:

- For Feature Updates: `feat/<brief 2-4 words-Description>`
- For Bug Fixes: `fix/<brief 2-4 words-Description>`
- For Documentation: `docs/<brief 2-4 words-Description>`

To create a new branch, use the following command:

```bash
git checkout -b <your-branch-name>
```

#### 2. Run the project

The monorepo contains several independent packages and apps. Each has its own README for detailed instructions, but here is a quick overview:

- **Core Package (`packages/adk/`)**: Build and test the main ADK-TS framework.

  ```bash
  cd packages/adk
  pnpm build
  pnpm test
  ```

- **Documentation Site (`apps/docs/`)**: Run the docs locally.

  ```bash
  cd apps/docs
  pnpm dev
  ```

- **Examples (`apps/examples/`)**: Explore and run example agents and flows.

  ```bash
  pnpm build
  cd apps/examples
  pnpm dev
  ```

Refer to each package or app's own README for more details and available scripts.

#### 3. Make your changes

You are to make only one contribution per pull request. It makes it easier to review and merge. If you have multiple bug fixes or features, create separate pull requests for each.

#### 4. Commit your changes

Your commit message should give a concise idea of the issue you are solving. It should follow the [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) specification, as this helps us generate the project changelog automatically. A traditional structure of commit looks like so:

```bash
<type>(optional scope): <description>
```

To commit your changes, run the following command:

```bash
git add .
git commit -m "<your_commit_message>"
```

Eg:

```bash
git commit -m "feat: add support for custom tools"
```

#### 5. Push your changes

After committing your changes, push your local commits to your remote repository.

```bash
git push origin your-branch-name
```

[🔝 Back to top](#table-of-contents)

<span id="opening-a-pull-request"></span>

### Opening a Pull Request (PR)

#### 1. Create a new Pull Request (PR)

Go to the [ADK-TS repository](https://github.com/IQAIcom/adk-ts/tree/main) and click the `compare & pull request` button or go to the [Pull Request page](https://github.com/IQAIcom/adk-ts/pulls) and click on the `New pull request` button. It will take you to the `Open a pull request` page.

> Note: Make sure your PR points to the `main` branch, not any other one.

#### 2. Wait for review

🎉 Congratulations! You've made your pull request! A maintainer will review and merge your code or request changes. If changes are requested, make them and push them to your branch. Your pull request will automatically track the changes on your branch and update.

[🔝 Back to top](#table-of-contents)

<span id="license"></span>

## 📜 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

<span id="security"></span>

## 🔒 Security

If you discover a security vulnerability within this project, please report it by following our [Security Policy](SECURITY.md). We take security seriously and will respond promptly to any reports.

[🔝 Back to top](#table-of-contents)
