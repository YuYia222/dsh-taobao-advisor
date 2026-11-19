# 发布到 GitHub（三步，凭据不经过任何第三方）

这个目录已经是一个**可提交的仓库**：文件、首次提交都做好了。你只差「建仓库 + 推上去 + 开 Pages」。

> ⚠️ 不要把 GitHub 密码或 token 发给任何人（包括 AI 助手）——贴进对话就会留在会话记录里。
> 下面的认证全部在**你本机**的 Git 凭据窗口里完成。

## 1. 在 GitHub 建一个空仓库

网页 <https://github.com/new>：

- Repository name：`taobao-advisor`
- 可见性：**Public**（别人才能下载；私有仓库的 ZIP 只对被邀请者可见）
- **不要**勾 Add README / .gitignore / license（本地都有了）

## 2. 推送（认证在你本机完成）

在本目录打开终端：

```bash
git remote add origin https://github.com/<你的用户名>/taobao-advisor.git
git push -u origin main
```

第一次 push 会弹 **Git Credential Manager**：

- 点「Sign in with your browser」→ 浏览器授权一次（推荐）；
- 或用 **fine-grained PAT**：权限只勾 **Contents: Read and write**，仓库只选这一个，用完可撤销。

## 3. 别人怎么装（不用压缩包）

仓库变成公开后，任何人一条命令：

```bash
dsh plugin --profile desktop install git+https://github.com/<你的用户名>/taobao-advisor.git
```

因为**仓库根目录就是插件包**（`package.json` 在根上），pnpm 能直接把它当包安装。

也可以让 `dsh` 装指定 tag：

```bash
dsh plugin --profile desktop install git+https://github.com/<你的用户名>/taobao-advisor.git#v1.0.0
```

## 4. 开启可读页面（可选）

仓库 → Settings → Pages → Source 选 `Deploy from a branch` → Branch `main`、目录 `/docs` → Save。

1–2 分钟后：

```
https://<你的用户名>.github.io/taobao-advisor/
```

页面里的「下载 ZIP / 查看源码」按钮会按当前域名自动算出你的仓库地址，不用改代码。

## 之后更新

```bash
git add -A && git commit -m "更新：xxx" && git push
```

已经用 `git+` 装过的人执行 `dsh plugin --profile desktop install git+https://github.com/<你>/taobao-advisor.git` 重新拉一次即可（或在插件页移除后重装）。

## 发到 npm（可选，比 git 更省事）

```bash
# 改 package.json：name 换成你自己的 scope，删掉 "private": true，version +1
npm publish --access public
```

之后别人就能 `dsh plugin --profile desktop install @你的scope/taobao-advisor`。
