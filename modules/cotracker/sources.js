export const SHA='82e02e8029753ad4ef13cf06be7f4fc5facdda4d';
const prefix=`https://github.com/facebookresearch/co-tracker/blob/${SHA}/`;
export const paths={online:'cotracker/models/core/cotracker/cotracker3_online.py',offline:'cotracker/models/core/cotracker/cotracker3_offline.py',transformer:'cotracker/models/core/cotracker/cotracker.py',blocks:'cotracker/models/core/cotracker/blocks.py',utils:'cotracker/models/core/model_utils.py',real:'train_on_real_data.py',kubric:'train_on_kubric.py',predictor:'cotracker/predictor.py',loss:'cotracker/models/core/cotracker/losses.py',build:'cotracker/models/build_cotracker.py'};
export const code=(key,line)=>prefix+paths[key]+(line?`#L${line}`:'');
export const paper=(page)=>`https://arxiv.org/pdf/2410.11831#page=${page}`;
export const source=(key,line,label)=>`<a class="source-link" href="${code(key,line)}" target="_blank" rel="noreferrer">${label} ↗</a>`;
export const reference=(page,label)=>`<a class="source-link" href="${paper(page)}" target="_blank" rel="noreferrer">${label} ↗</a>`;
export const mappings=[
 ['任务与初始化','offline',132,'coords / vis / confidence','复制 Query 的空间坐标到每帧；C、V 的内部 logit 从 0 开始。'],
 ['Feature CNN','online',63,'BasicEncoder / fnet','每帧 RGB → dense feature；两种版本共享基类。'],
 ['多尺度','offline',105,'fmaps_pyramid','基础 feature 归一化后，再连续做 2× average pooling，形成 4 层。'],
 ['Query 邻域','online',94,'get_support_points / get_track_feat','固定 query frame 和 query coordinates，采样邻域。'],
 ['当前估计邻域','online',130,'get_correlation_feat','每轮由当前坐标重新生成 support points 并采样。'],
 ['4D correlation','offline',154,'einsum → corr_volume','比较 track patch 与 query patch 所有位置的特征向量。'],
 ['Correlation 压缩','online',84,'corr_mlp','2401 → 384 → 256；四尺度输出拼接为 1024 维。'],
 ['Motion 与时间编码','offline',164,'posenc / interpolate_time_embed','相邻帧双向坐标差归一化、Fourier 编码；另加时间编码。'],
 ['联合更新网络','transformer',387,'EfficientUpdateFormer','3 组时间与跨轨迹更新，64 个可学习的代理 token。'],
 ['代理通信方向','transformer',510,'space_virtual2point_blocks → space_virtual_blocks → space_point2virtual_blocks','名称容易误读：实际先 virtual 作为 Query 读取 point，再让 point 读取 virtual。'],
 ['增量与反馈','offline',204,'delta_coords / delta_vis / delta_confidence','增量加到当前状态；下一轮从更新坐标重采样。'],
 ['Online 窗口衔接','online',458,'overlap / copy_over / coords_prev','16 帧窗前进 8 帧；继承重叠区，新增帧以末尾状态延展初始化。'],
 ['Offline 整段处理','offline',19,'CoTrackerThreeOffline.forward','整个 clip 的时间 token 一次参与更新，时间编码按长度插值。'],
 ['官方便捷接口','predictor',157,'CoTrackerPredictor / CoTrackerOnlinePredictor','底层模型默认 4 次更新；官方 predictor 调用 6 次。Offline predictor 常用返回 tracks 和 visibility，不直接返回 confidence。'],
 ['SIFT 选 Query','utils',55,'get_sift_sampled_pts','默认抽 8 次帧，偏向前 25% 时间；SIFT 不参与推理特征提取。'],
 ['随机教师与伪标签','real',106,'random.choice / torch.no_grad','每个 batch 一个 teacher；辅助 support queries 生成标签后被丢弃。'],
 ['冻结范围','real',53,'fetch_optimizer / vis_conf_head','只冻结独立 C/V 线性输出头；共享网络和坐标头仍训练。'],
 ['合成数据预训练','kubric',191,'trajectory / confidence / visibility losses','轨迹监督与 C/V 监督都存在；真实阶段不再计算 C/V 的监督损失。'],
 ['真实数据微调','real',196,'sequence_loss','teacher 轨迹监督 student；teacher visibility 用于区分可见/遮挡轨迹权重。'],
 ['损失实现细节','loss',13,'sequence_loss / sequence_prob_loss','论文的紧凑公式与代码并非逐字一致：可见点用 Huber，遮挡分支用 L1；C 的标签为 12px 内，并按 GT visibility 掩码。']
];
