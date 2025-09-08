const express = require("express");
const crypto = require("crypto-js");

const app = express();
const port = 3000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// 将在 服务号/公众号 后台配置的 Token 值填入这里
const WECHAT_TOKEN = 'wechat'

/**
 * 专门用于微信服务号/公众号注册服务器时验证 Token 时启动
 */
app.get('/wechat/register', (req, res) => {
    try {
      // 从请求参数中获取微信服务器发送的验证信息
      const { signature, timestamp, nonce, echostr } = req.query;

      // 验证参数是否完整
      if (!signature || !timestamp || !nonce || !echostr) {
        return res.status(400).send("缺少必要参数");
      }

      // 将token、timestamp、nonce按字典序排序
      const sorted = [WECHAT_TOKEN, timestamp, nonce].sort();

      // 拼接并进行SHA1加密
      const hashcode = crypto.SHA1(sorted.join("")).toString(crypto.enc.Hex);

      // 打印调试信息
      console.log(
        `验证信息 - 计算的hash: ${hashcode}, 接收的signature: ${signature}`
      );

      // 验证通过则返回echostr，否则返回空
      if (hashcode === signature) {
        res.status(200).send(echostr);
      } else {
        res.send("");
      }
    } catch (error) {
        console.error('验证出错', error.message)
        res.send('')
    }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
