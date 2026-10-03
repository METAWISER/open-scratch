# Your next idea starts here.

OpenScratch is a free, open-source desktop playground for **JavaScript, TypeScript, Python, and C#**. Write code on the left. Explore the result on the right. No account, subscription, credits, or mandatory cloud service.

## Run your first snippet

1. Open OpenScratch and choose **JS** in the status bar.
2. Keep **Auto Log** enabled and enter the code below.
3. Click **Run**, or press **Ctrl/Cmd R**.

```js
const answer = 21 * 2;
answer; // 42
```

The result appears next to its source line. Click that line to return to the code. Use **Stop** to terminate the current execution, even if it is stuck in a loop.

## Choose your language

JavaScript and TypeScript run out of the box. JSX and TSX are available for React experiments. Install Python 3.10+ or .NET SDK 8+ on your computer to use Python or C#.

[Explore language support](../languages.md) for setup, supported features, and differences between engines.

## Learn by doing

Open **Learn**, search for a method or an idea, and click an example. It opens in its own tab without replacing your code. Auto Run is disabled until you decide to execute. Prefer pasting manually? Use **Copy** instead.

[Explore the learning workflow](../learning.md).

## Make it yours

Open **Preferences** using the sliders button at the bottom of the sidebar. Choose English or Spanish, light or dark appearance, font size, wrapping, and execution protections. Settings and tabs are saved locally.

Compiler messages, package logs, user output, and Monaco's built-in editor commands may retain their original language. Application controls, native menus, and learning explanations follow your preference.

## Install or build

The source is available on [GitHub](https://github.com/METAWISER/open-scratch). There is no published installer download unless the repository's Releases page lists one. Development installers produced locally are unsigned.

```sh
git clone https://github.com/METAWISER/open-scratch.git
cd open-scratch
pnpm install --frozen-lockfile
pnpm dev
```

Use Node 24 and pnpm 11.19. The first dependency installation requires Internet. Running existing snippets and installed dependencies does not.
