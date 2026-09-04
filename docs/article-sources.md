# 文章出处与版本说明

核对日期：2026-09-04。全文指所列独立作品或明确指定的完整章节，不含网站导航、后人评论与校勘注释。练习版使用来源的简体显示，去掉排版换行和不可见字符，少量异体字及引号统一为常用形式；《水调歌头》保留小序，《滕王阁序》保留附诗，小说章节保留章末诗句。

## 已核实的公版全文

| 作品 | 练习字符数 | 来源 |
| --- | ---: | --- |
| 桃花源记 | 398 | [陶渊明 · 全文](https://zh.wikisource.org/zh-hans/%E6%A1%83%E8%8A%B1%E6%BA%90%E8%A8%98) |
| 陋室铭 | 99 | [刘禹锡 · 全文](https://zh.wikisource.org/zh-hans/%E9%99%8B%E5%AE%A4%E9%8A%98) |
| 爱莲说 | 144 | [周敦颐 · 全文](https://zh.wikisource.org/zh-hans/%E6%84%9B%E8%93%AE%E8%AA%AA) |
| 记承天寺夜游 | 109 | [苏轼 · 全文](https://zh.wikisource.org/zh-hans/%E8%A8%98%E6%89%BF%E5%A4%A9%E5%AF%BA%E5%A4%9C%E9%81%8A) |
| 岳阳楼记 | 447 | [范仲淹 · 全文](https://zh.wikisource.org/zh-hans/%E5%B2%B3%E9%99%BD%E6%A8%93%E8%A8%98) |
| 劝学篇 | 1980 | [荀子 · 全文](https://zh.wikisource.org/zh-hans/%E8%8D%80%E5%AD%90/%E5%8B%B8%E5%AD%B8%E7%AF%87) |
| 前赤壁赋 | 649 | [苏轼 · 全文](https://zh.wikisource.org/zh-hans/%E5%89%8D%E8%B5%A4%E5%A3%81%E8%B3%A6) |
| 滕王阁序（含诗） | 928 | [王勃 · 全文](https://zh.wikisource.org/zh-hans/%E6%BB%95%E7%8E%8B%E9%96%A3%E5%BA%8F) |
| 春望 | 48 | [杜甫 · 全文](https://zh.wikisource.org/zh-hans/%E6%98%A5%E6%9C%9B) |
| 水调歌头（含小序） | 136 | [苏轼 · 全文](https://zh.wikisource.org/zh-hans/%E6%B0%B4%E8%AA%BF%E6%AD%8C%E9%A0%AD%20%28%E6%98%8E%E6%9C%88%E5%B9%BE%E6%99%82%E6%9C%89%29) |
| 孔乙己 | 2611 | [鲁迅 · 全文](https://zh.wikisource.org/zh-hans/%E5%AD%94%E4%B9%99%E5%B7%B1) |
| 范进中举 · 儒林外史第三回 | 7874 | [吴敬梓 · 全文](https://zh.wikisource.org/zh-hans/%E5%84%92%E6%9E%97%E5%A4%96%E5%8F%B2/%E7%AC%AC03%E5%9B%9E) |
| 骂王朗 · 三国演义第九十三回 | 5384 | [罗贯中 · 全文](https://zh.wikisource.org/zh-hans/%E4%B8%89%E5%9C%8B%E6%BC%94%E7%BE%A9/%E7%AC%AC093%E5%9B%9E) |
| 湖心亭看雪 | 196 | [张岱 · 全文](https://zh.wikisource.org/zh-hans/%E6%B9%96%E5%BF%83%E4%BA%AD%E7%9C%8B%E9%9B%AA) |
| 前出师表 | 746 | [诸葛亮 · 全文](https://zh.wikisource.org/zh-hans/%E5%87%BA%E5%B8%AB%E8%A1%A8) |
| 兰亭集序 | 389 | [王羲之 · 全文](https://zh.wikisource.org/zh-hans/%E8%98%AD%E4%BA%AD%E9%9B%86%E5%BA%8F) |
| 师说 | 560 | [韩愈 · 全文](https://zh.wikisource.org/zh-hans/%E5%B8%AB%E8%AA%AA) |
| 小杂感 · 人类的悲欢 | 991 | [鲁迅 · 全文](https://zh.wikisource.org/zh-hans/%E5%B0%8F%E9%9B%9C%E6%84%9F) |
| 聪明人和傻子和奴才 | 875 | [鲁迅 · 全文](https://zh.wikisource.org/zh-hans/%E8%81%B0%E6%98%8E%E4%BA%BA%E5%92%8C%E5%82%BB%E5%AD%90%E5%92%8C%E5%A5%B4%E6%89%8D) |

来源原作均为公版作品；不将现代译文、网站赏析或他人影视改编台词当成公版正文。保留作者署名；正文边界、长度和内容指纹记录在 `tests/fixtures/article-sources.json`，用于防止后续误改成节选。

## 用户提供的全文

《康神开播了》《优势在我》《下课》沿用此前接入的用户原文，去掉排版空白；《康神开播了》仅按用户要求将“明天在玩”修正为“明天再玩”。原 TXT 已移除，测试以 `tests/fixtures/user-articles.json` 中独立保存的长度和 SHA-256 指纹核对正文，不再依赖根目录 TXT。旧文本指纹由 Git HEAD 的原 TXT 生成，并应用这一个明确勘误。页面只展示篇名与长度，不显示来源类别标签。

其余原创趣味及日常随笔为 Typeflow 原创。“窃书不能算偷”收录《孔乙己》全文；“人类的悲欢并不相通”收录《小杂感》全文；范进与王朗名场面收录原著整回。

## 用户提供的歌曲（2026-09-04）

从 `src/cn` 接入 17 篇，从 `src/en` 接入 2 篇，标为“用户提供版”，不宣称是已核实的完整版或公版。第一行作为篇名、第二行作为歌手署名，其余为练习正文。保留大小写、英文词间空格及重复段落，换行合并为空格；移除《游京》的平台宣传行，将《Hey Jude》中连续重复的单引号合并为一个，除此以外不补写或改写歌词。原始素材文件保持不变。

中文：七里香、光辉岁月、夜曲、大城小爱、富士山下、小半、开始懂了、我怀念的、晴天、海阔天空、游京、爱情讯息、稻香、红豆、美人鱼、走马、青花瓷。英文：Counting Stars、Hey Jude。

接入正文存于 `web/lib/typing.mjs`，素材路径、篇名、语言、长度与内容指纹保存在 `tests/fixtures/user-articles.json`；CI 不依赖被忽略的 `src` 目录。
