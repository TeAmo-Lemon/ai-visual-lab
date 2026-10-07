export type TensorName = 'feature' | 'X' | 'C' | 'Q' | 'K' | 'V' | 'score' | 'scaled' | 'weights' | 'O' | 'projected' | 'restored' | 'residual';
export const STEPS: {title:string; short:string; tensor:TensorName; formula:string; explanation:string}[] = [
  {title:'U-Net 的空间特征',short:'Feature map',tensor:'feature',formula:'x ∈ ℝ[B,C,H,W]',explanation:'每个空间格子存储一个通道向量。它是卷积/ResNet 提取的中间特征，不是原图的 RGB 像素。选择一个格子，追踪它的整个计算。'},
  {title:'把空间位置展开成序列',short:'Flatten',tensor:'X',formula:'[B,C,H,W] → [B,C,HW] → [B,HW,C]',explanation:'先合并 H、W，再交换通道轴和位置轴。没有求平均，也没有丢掉空间位置：第 r 行、第 c 列对应 token r×W+c。'},
  {title:'图像特征生成 Query',short:'Query',tensor:'Q',formula:'Q = X Wq',explanation:'同一个 Wq 作用于所有 image token。每个 token 的通道向量变成 Query，去询问“与哪些上下文特征匹配”。Wq 是训练得到的参数。'},
  {title:'Prompt 变成文本条件',short:'Text embedding',tensor:'C',formula:'prompt → tokenizer → text encoder → C',explanation:'真实 CLIP 使用子词切分、位置编码和上下文编码。这里按词切分并使用 mock embedding；教学版只保留 3 个内容词，便于逐项核算。'},
  {title:'文本生成 Key',short:'Key',tensor:'K',formula:'K = C Wk',explanation:'Key 提供匹配特征。Q 和 K 在投影后具有相同的末维，才能做点积。文本原始 768 维不需要与图像的 320 维相同。'},
  {title:'文本生成 Value',short:'Value',tensor:'V',formula:'V = C Wv',explanation:'Value 提供要传递的内容。它与 Key 共享来源 C，却使用另一组权重 Wv。Key 和 Value 的角色由训练形成，并非人为指定的语义字段。'},
  {title:'每个 Query 与所有 Key 配对',short:'Q × Kᵀ',tensor:'score',formula:'Sᵢⱼ = qᵢ · kⱼ',explanation:'第 i 行是一个 image token，第 j 列是一个 text token。每格是两个向量的点积，表示学习到的匹配分数；分数可以为负，也不是概率。'},
  {title:'缩放点积分数',short:'Scale',tensor:'scaled',formula:'L = QKᵀ / √d_head',explanation:'维度越大，点积的幅度通常越大。除以 √d_head 有助于避免 Softmax 过早饱和。数值示例 d=4，因此除以 2；8 头、每头 40 维时除以 √40。'},
  {title:'把每一行变成注意力权重',short:'Softmax',tensor:'weights',formula:'Aᵢⱼ = exp(Lᵢⱼ) / Σⱼ exp(Lᵢⱼ)',explanation:'沿 Key/token 轴分别对每一行做 Softmax。每个 image token 分配自己的权重，总和为 1。它表示对不同 token 的相对关注，而不是“该词存在于图像中的概率”。'},
  {title:'按关注程度读取 Value',short:'Weights × V',tensor:'O',formula:'oᵢ = Σⱼ Aᵢⱼ vⱼ',explanation:'权重只有“关注谁”的分配比例，不能直接作为图像通道特征。乘 V 才能读出内容：把所有 Value 按权重相加，为每个 image token 生成一个新向量。'},
  {title:'输出投影回图像通道',short:'Projection',tensor:'projected',formula:'Y = Concat(head₁,…,headₕ) Wo',explanation:'单头的输出直接通过 Wo；多头先拼接再通过 Wo，混合各头的信息，并映射回残差分支所需的通道维度。'},
  {title:'序列还原为二维 Feature Map',short:'Reshape',tensor:'restored',formula:'[B,HW,C] → [B,H,W,C] → [B,C,H,W]',explanation:'还原使用相同的空间顺序。token i 返回 (⌊i/W⌋, i mod W)。其通道向量已携带条件信息，随后可以继续交给 U-Net 的卷积/ResNet。'},
  {title:'把条件更新加入原特征',short:'Residual',tensor:'residual',formula:'x_out = x + Δx',explanation:'残差把已有图像特征与注意力分支的更新相加。这里展示简化的外层残差；真实 SpatialTransformer 包含输出 1×1 卷积，内部 Transformer 还各自有 3 条残差。'},
];
export const COLORS: Record<TensorName,string> = {feature:'#48602f',X:'#48602f',C:'#745487',Q:'#48602f',K:'#745487',V:'#936522',score:'#426b4e',scaled:'#426b4e',weights:'#426b4e',O:'#936522',projected:'#936522',restored:'#48602f',residual:'#48602f'};
export const NAMES:Record<TensorName,string> = {feature:'空间特征 x',X:'Image tokens X',C:'Text embedding C',Q:'Query Q',K:'Key K',V:'Value V',score:'Attention score S',scaled:'Scaled logits L',weights:'Attention weights A',O:'Attention output O',projected:'Projected output Y',restored:'Spatial update Δx',residual:'Residual output'};
