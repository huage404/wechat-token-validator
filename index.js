const express = require("express");
const crypto = require("crypto-js");

const app = express();
const port = 3000;

// 设置静态文件目录
app.use(express.static('public'));

// 禁用缓存中间件
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    next();
});

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

// 处理微信授权回调
async function handleWechatCallback(code) {
    try {
        const appId = process.env.WECHAT_APP_ID;
        const appSecret = process.env.WECHAT_APP_SECRET;
        
        console.log('开始处理微信授权回调');
        console.log('参数信息:', {
            appId,
            code,
            redirectUri: process.env.WECHAT_REDIRECT_URI
        });
        
        // 获取访问令牌
        console.log('正在请求访问令牌...');
        const tokenResponse = await axios.get(
            `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${appSecret}&code=${code}&grant_type=authorization_code`
        );
        
        console.log('访问令牌响应:', {
            status: tokenResponse.status,
            statusText: tokenResponse.statusText,
            data: tokenResponse.data
        });
        
        const { access_token, openid } = tokenResponse.data;
        
        // 获取用户信息
        console.log('正在获取用户信息...');
        const userInfoResponse = await axios.get(
            `https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}&lang=zh_CN`
        );
        
        console.log('用户信息响应:', {
            status: userInfoResponse.status,
            statusText: userInfoResponse.statusText,
            data: userInfoResponse.data
        });
        
        return userInfoResponse.data;
    } catch (error) {
        console.error('微信授权回调处理失败:', {
            message: error.message,
            response: error.response ? {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            } : 'No response',
            stack: error.stack
        });
        throw error;
    }
}

app.get("/wechat/callback", async (req, res) => {
  console.log("收到微信回调请求:", {
    query: req.query,
    headers: req.headers,
    ip: req.ip,
  });

  try {
    const { code } = req.query;
    if (!code) {
      console.error("缺少授权码");
      return res.status(400).json({
        success: false,
        error: "Missing authorization code",
      });
    }

    console.log("开始处理授权码:", code);
    const userInfo = await handleWechatCallback(code);

    console.log("成功获取用户信息，准备返回响应");

    const templatePath = path.join(__dirname, "public", "callback.html");

    fs.readFile(templatePath, "utf8", (err, data) => {
      if (err) {
        console.error("Error reading template:", err);
        return res.status(500).send("Error loading page");
      }

      console.log("userInfo", userInfo);
      // 替换所有出现的 {{userInfo}}
      const html = data.replace(/\{\{userInfo\}\}/g, JSON.stringify(userInfo));
      res.send(html);
    });
  } catch (error) {
    console.error("处理微信回调失败:", {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
