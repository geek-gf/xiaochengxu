# 个人信息认证页（/pages/verify/）

## 功能说明

本页面供用户进行学籍信息认证。用户需填写以下 5 项信息，与云数据库 `studentList` 集合中的记录完全匹配后，即视为认证成功。

| 页面字段   | 数据库字段    |
|-----------|-------------|
| 真实姓名   | `trueName`  |
| 学院       | `college`   |
| 年级       | `grade`     |
| 班级       | `classNum`  |
| 学号       | `studentId` |

认证成功后会同步写入：
- 本地缓存 `userInfo.isVerified = true`（及学籍各字段）
- 云端 `users` 集合对应用户记录：`isVerified: true`（及学籍各字段）

已认证用户再次打开该页面，表单将只读展示，无法再次修改。

---

## 云数据库准备：创建 `studentList` 集合并导入学生数据

### 步骤

1. 登录[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)，打开本项目。
2. 点击顶部菜单 **云开发** → 进入云开发控制台。
3. 选择左侧 **数据库** → 点击 **+** 新建集合，集合名称填写 `studentList`。
4. 进入 `studentList` 集合，点击 **添加记录**，按以下格式手动填写字段：

```json
{
  "trueName": "麻智孟",
  "college": "机器人科学与工程学院",
  "grade": "23级",
  "classNum": "机器人2301",
  "studentId": "20237843"
}
```

> 每名学生对应一条记录，字段名称与类型必须与上述保持一致（均为字符串）。

### 批量导入

如需批量导入，可将学生数据整理为 JSON Lines 格式（每行一条 JSON 对象）后，在云开发控制台 → 数据库 → `studentList` 集合中使用 **导入** 功能上传。

---

## 数据库权限配置

`studentList` 集合建议设置为：**所有用户可读，仅管理员可写**，确保小程序端可直接查询而无需云函数中转。

在云开发控制台 → 数据库 → `studentList` → 权限设置中，选择 **自定义安全规则**，填写：

```json
{
  "read": true,
  "write": false
}
```
