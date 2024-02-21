import sky_shader from "./shaders/sky_shader.wgsl";
import shader from "./shaders/shaders.wgsl";
import { TriangleMesh } from "./triangle_mesh";
import { QuadMesh } from "./quad_mesh";
import { mat4 } from "gl-matrix";
import { Material } from "./material";
import { pipeline_types, object_types, RenderData } from "../model/definitions";
import { ObjMesh } from "./obj_mesh";
import { CubeMapMaterial } from "./cube_material";
import { Camera } from "../model/camera";
import {CanvasManager} from "../control/canvas-manager";

export class Renderer {

    canvasManager: CanvasManager;
    canvas: HTMLCanvasElement;

    // Device/Context objects
    adapter: GPUAdapter;
    device: GPUDevice;
    context: GPUCanvasContext;
    format : GPUTextureFormat;

    // Pipeline objects
    uniformBuffer: GPUBuffer;
    pipelines: {[pipeline in pipeline_types]: GPURenderPipeline | null};
    frameGroupLayouts: {[pipeline in pipeline_types]: GPUBindGroupLayout | null};
    materialGroupLayout: GPUBindGroupLayout;
    frameBindGroups: {[pipeline in pipeline_types]: GPUBindGroup | null};

    // Depth Stencil stuff
    depthStencilState: GPUDepthStencilState;
    depthStencilBuffer: GPUTexture;
    depthStencilView: GPUTextureView;
    depthStencilAttachment: GPURenderPassDepthStencilAttachment;

    // Assets
    parallelepipedMesh: ObjMesh;
    quadMesh: QuadMesh;
    cubeMesh: ObjMesh;

    cubeMaterial: Material;
    quadMaterial: Material;
    parallelepipedMaterial: Material;

    objectBuffer: GPUBuffer;
    parameterBuffer: GPUBuffer;
    skyMaterial: CubeMapMaterial;

    constructor(canvasManager: CanvasManager){
        this.canvasManager = canvasManager;
        this.canvas = canvasManager.canvas;

        this.pipelines = {
            [pipeline_types.SKY]: null,
            [pipeline_types.STANDARD]: null,
        }
    }

    async Initialize() {
        await this.setupDevice();

        await this.makeBindGroupLayouts();

        await this.createAssets();

        await this.makeDepthBufferResources();
    
        await this.makePipelines();

        await this.makeBindGroups();

        addEventListener('resize', () => {
            this.depthStencilBuffer.destroy();
            this.makeDepthBufferResources();
        });
    }

    async setupDevice() {

        //adapter: wrapper around (physical) GPU.
        //Describes features and limits
        this.adapter = <GPUAdapter> await navigator.gpu?.requestAdapter();
        //device: wrapper around GPU functionality
        //Function calls are made through the device
        this.device = <GPUDevice> await this.adapter?.requestDevice();
        //context: similar to vulkan instance (or OpenGL context)
        this.context = this.canvas.getContext("webgpu") as unknown as GPUCanvasContext;
        this.format = "bgra8unorm";
        this.context.configure({
            device: this.device,
            format: this.format,
            alphaMode: "opaque"
        });

    }

    async makeDepthBufferResources() {

        this.depthStencilState = {
            format: "depth24plus-stencil8",
            depthWriteEnabled: true,
            depthCompare: "less-equal",
        };

        const size: GPUExtent3D = {
            width: this.canvas.width,
            height: this.canvas.height,
            depthOrArrayLayers: 1
        };
        const depthBufferDescriptor: GPUTextureDescriptor = {
            size: size,
            format: "depth24plus-stencil8",
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        }
        this.depthStencilBuffer = this.device.createTexture(depthBufferDescriptor);

        const viewDescriptor: GPUTextureViewDescriptor = {
            format: "depth24plus-stencil8",
            dimension: "2d",
            aspect: "all"
        };
        this.depthStencilView = this.depthStencilBuffer.createView(viewDescriptor);

        this.depthStencilAttachment = {
            view: this.depthStencilView,
            depthClearValue: 1.0,
            depthLoadOp: "clear",
            depthStoreOp: "store",

            stencilLoadOp: "clear",
            stencilStoreOp: "discard"
        };

    }

    async makeBindGroupLayouts() {

        this.frameGroupLayouts = {
            [pipeline_types.SKY]: null,
            [pipeline_types.STANDARD]: null,
        }
        this.frameGroupLayouts[pipeline_types.SKY] = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: "uniform",
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        viewDimension: "cube",
                    }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {
                    }
                },
            ]

        });

        this.frameGroupLayouts[pipeline_types.STANDARD] = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {}
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: "read-only-storage",
                        hasDynamicOffset: false
                    }
                }
            ]

        });

        this.materialGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {}
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {}
                }
            ]

        });

    }

    async makePipelines() {
        
        var pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [
                this.frameGroupLayouts[pipeline_types.STANDARD] as GPUBindGroupLayout, 
                this.materialGroupLayout
            ]
        });
    
        this.pipelines[pipeline_types.STANDARD] = this.device.createRenderPipeline({
            vertex : {
                module : this.device.createShaderModule({
                    code : shader
                }),
                entryPoint : "vs_main",
                buffers: [this.parallelepipedMesh.bufferLayout,]
            },
    
            fragment : {
                module : this.device.createShaderModule({
                    code : shader
                }),
                entryPoint : "fs_main",
                targets : [{
                    format : this.format
                }]
            },
    
            primitive : {
                topology : "triangle-list"
            },
    
            layout: pipelineLayout,
            depthStencil: this.depthStencilState,
        });

        pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [
                this.frameGroupLayouts[pipeline_types.SKY] as GPUBindGroupLayout,
            ]
        });
        this.pipelines[pipeline_types.SKY] = this.device.createRenderPipeline({
            vertex : {
                module : this.device.createShaderModule({
                    code : sky_shader
                }),
                entryPoint : "sky_vert_main"
            },
    
            fragment : {
                module : this.device.createShaderModule({
                    code : sky_shader
                }),
                entryPoint : "sky_frag_main",
                targets : [{
                    format : this.format
                }]
            },
    
            primitive : {
                topology : "triangle-list"
            },
    
            layout: pipelineLayout,
            depthStencil: this.depthStencilState,
        });

    }

    async createAssets() {
        this.quadMesh = new QuadMesh(this.device);

        this.parallelepipedMesh = new ObjMesh();
        await this.parallelepipedMesh.initialize(this.device, "static/models/parallelepiped.obj");

        this.cubeMesh = new ObjMesh();
        await this.cubeMesh.initialize(this.device, "static/models/cube.obj");

        this.cubeMaterial = new Material();
        this.parallelepipedMaterial = new Material();
        this.quadMaterial = new Material();

        this.uniformBuffer = this.device.createBuffer({
            size: 64 * 2,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        const modelBufferDescriptor: GPUBufferDescriptor = {
            size: 64 * 1024,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        };
        this.objectBuffer = this.device.createBuffer(modelBufferDescriptor);

        const parameterBufferDescriptor: GPUBufferDescriptor = {
            size: 48,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        };
        this.parameterBuffer = this.device.createBuffer(
            parameterBufferDescriptor
        );

        await this.cubeMaterial.initialize(this.device, "static/img/obj.png", this.materialGroupLayout);
        await this.parallelepipedMaterial.initialize(this.device, "static/img/obj2.png", this.materialGroupLayout);
        await this.quadMaterial.initialize(this.device, "static/img/floor.png", this.materialGroupLayout);

        const urls = [
            "static/img/sky_back.png",  //x+
            "static/img/sky_front.png",   //x-
            "static/img/sky_left.png",   //y+
            "static/img/sky_right.png",  //y-
            "static/img/sky_top.png", //z+
            "static/img/sky_bottom.png",    //z-
        ]
        this.skyMaterial = new CubeMapMaterial();
        await this.skyMaterial.initialize(this.device, urls);
    }

    async makeBindGroups() {

        this.frameBindGroups = {
            [pipeline_types.SKY]: null,
            [pipeline_types.STANDARD]: null,
        }
        this.frameBindGroups[pipeline_types.STANDARD] = this.device.createBindGroup({
            layout: this.frameGroupLayouts[pipeline_types.STANDARD] as GPUBindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.uniformBuffer
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.objectBuffer,
                    }
                }
            ]
        });

        this.frameBindGroups[pipeline_types.SKY] = this.device.createBindGroup({
            layout: this.frameGroupLayouts[pipeline_types.SKY] as GPUBindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.parameterBuffer,
                    }
                },
                {
                    binding: 1,
                    resource: this.skyMaterial.view
                },
                {
                    binding: 2,
                    resource: this.skyMaterial.sampler
                }
            ]
        });
    }

    prepareScene(renderables: RenderData, camera: Camera) {

        //make transforms
        const projection = mat4.create();
        mat4.perspective(projection, Math.PI/4, this.canvasManager.proportion, 0.1, 10);

        const view = renderables.view_transform;

        this.device.queue.writeBuffer(
            this.objectBuffer, 0, 
            renderables.model_transforms, 0, 
            renderables.model_transforms.length
        );
        this.device.queue.writeBuffer(this.uniformBuffer, 0, <ArrayBuffer>view); 
        this.device.queue.writeBuffer(this.uniformBuffer, 64, <ArrayBuffer>projection); 

        const dy = Math.tan(Math.PI/8);
        const dx = dy * this.canvasManager.proportion;

        this.device.queue.writeBuffer(
            this.parameterBuffer, 0,
            new Float32Array(
                [
                    camera.forwards[0],
                    camera.forwards[1],
                    camera.forwards[2],
                    0.0,
                    dx * camera.right[0],
                    dx * camera.right[1],
                    dx * camera.right[2],
                    0.0,
                    dy * camera.up[0],
                    dy * camera.up[1],
                    dy * camera.up[2],
                    0.0
                ]
            ), 0, 12
        )
    }

    async render(renderables: RenderData, camera: Camera) {

        //Early exit tests
        if (!this.device || !this.pipelines[pipeline_types.STANDARD]) {
            return;
        }

        this.prepareScene(renderables, camera)
        
        //command encoder: records draw commands for submission
        const commandEncoder : GPUCommandEncoder = this.device.createCommandEncoder();
        //texture view: image view to the color buffer in this case
        const textureView : GPUTextureView = this.context.getCurrentTexture().createView();
        //renderpass: holds draw commands, allocated from command encoder
        const renderpass : GPURenderPassEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: textureView,
                clearValue: {r: 0.15, g: 0.0, b: 0.4, a: 1.0},
                loadOp: "clear",
                storeOp: "store"
            }],
            depthStencilAttachment: this.depthStencilAttachment,
        });

        renderpass.setPipeline(this.pipelines[pipeline_types.SKY] as GPURenderPipeline);
        renderpass.setBindGroup(0, this.frameBindGroups[pipeline_types.SKY]);

        renderpass.setBindGroup(1, this.quadMaterial.bindGroup); 
        renderpass.draw(6, 1, 0, 0);
        
        renderpass.setPipeline(this.pipelines[pipeline_types.STANDARD] as GPURenderPipeline);
        renderpass.setBindGroup(0, this.frameBindGroups[pipeline_types.STANDARD]);

        var objects_drawn: number = 0;

        //Triangles
        renderpass.setVertexBuffer(0, this.parallelepipedMesh.buffer);
        renderpass.setBindGroup(1, this.parallelepipedMaterial.bindGroup);
        renderpass.draw(
            this.parallelepipedMesh.vertexCount, renderables.object_counts[object_types.TRIANGLE],
            0, objects_drawn
        );
        objects_drawn += renderables.object_counts[object_types.TRIANGLE];

        //Triangles
        renderpass.setVertexBuffer(0, this.quadMesh.buffer);
        renderpass.setBindGroup(1, this.quadMaterial.bindGroup); 
        renderpass.draw(
            6, renderables.object_counts[object_types.QUAD], 
            0, objects_drawn
        );
        objects_drawn += renderables.object_counts[object_types.QUAD];

        //Statues
        renderpass.setVertexBuffer(0, this.cubeMesh.buffer);
        renderpass.setBindGroup(1, this.cubeMaterial.bindGroup);
        renderpass.draw(
          this.cubeMesh.vertexCount, renderables.object_counts[object_types.STATUE],
          0, objects_drawn
        );
        objects_drawn += renderables.object_counts[object_types.STATUE];


        //Cube
        // renderpass.setVertexBuffer(0, this.statueMesh.buffer);
        // renderpass.setBindGroup(1, this.triangleMaterial.bindGroup);
        // renderpass.draw(
        //     this.statueMesh.vertexCount, 1,
        //     0, objects_drawn
        // );
        // objects_drawn += 1;

        renderpass.end();
    
        this.device.queue.submit([commandEncoder.finish()]);

    }
    
}