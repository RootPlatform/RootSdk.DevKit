---
path: app-docs/tutorials/tasks-app/setup-root-and-dev-machine.md
audience: app
category: tutorial
summary: You can develop for the Root Platform on Windows or macOS. You'll need to do a few Root setup tasks before starting to write code.
---

# Set up Root and your dev machine

You can develop for the Root Platform on Windows or macOS. You'll need to do a few Root setup tasks before starting to write code. Skip any steps that you've completed previously.

## 1. Install software

### Node

You'll need Node version 22 or greater to run the local test host and for its package manager: [download link](https://nodejs.org/en/download). You can check your currently installed node version by running `node --version` from a terminal or command prompt.

### IDE

You'll write your Root App code using an editor of your choice, two popular options are VS Code and WebStorm:

* Visual Studio Code: [download link](https://code.visualstudio.com/download).
* JetBrains WebStorm: [download link](https://www.jetbrains.com/webstorm/).

### Root

Visit the Root [download page](https://www.rootapp.com/download) and install the Root desktop client on your development machine.

## 2. Sign up

You'll use a single Root account both as a Root member and a Root developer.

### Create a Root account

Here are the steps to create a Root account:

1. Start the Root application.
1. Select the 'Register' option at the bottom of the login screen.
1. Add your information to the registration page.
1. Select 'Register' to complete the registration process. You'll be logged in and ready to go.

### Join the Root developer program

The Root developer program lets you generate credentials for testing and publish your work to the store.

Open the [Root Developer Portal](https://dev.rootapp.com) and login with your Root account. That's it, you're in!

## 3. Create a project

A `project` in the Root Developer Portal is a container to host the identity, versions, code, and state of your App. You'll need one project for each of your Apps.

1. In a web browser, navigate to the [Root Developer Portal](https://dev.rootapp.com).
1. Log in with your Root credentials.
1. Select the **My apps** tab.
1. Select the **New app** button.
1. Enter a name for your App.
1. Agree to the terms.
1. Select **Create**.

## 4. Generate a `DEV_TOKEN` and a community

A `DEV_TOKEN` is a Root-generated token that encapsulates your identity, your authorization to access the Root infrastructure, and a community ID. You get a `DEV_TOKEN` from the Root Developer Portal.

1. In a web browser, navigate to the [Root Developer Portal](https://dev.rootapp.com).
1. Log in with your Root credentials.
1. Select the **My apps** tab.
1. Select one of your Apps from the list.
1. Select the **Settings** tab.
1. Select the **Generate new dev token** button.
1. Select **Generate**.
1. Copy the generated `DEV_TOKEN`.

Don't share your `DEV_TOKEN`; treat it like a password.

Your code will always run in the context of a community. Root automatically creates a test community for your when you generate your first `DEV_TOKEN` for a project. The community will be named after your project name with the suffix `-test` added. If you delete the community, Root will create a new one for you the next time you generate a DEV_TOKEN.