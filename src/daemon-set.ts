import { ApiObject, ApiObjectMetadataDefinition, Lazy, Names } from 'cdk8s';
import { Construct } from 'constructs';
import * as base from './base';
import * as container from './container';
import * as k8s from './imports/k8s';
import * as pod from './pod';
import * as serviceaccount from './service-account';
import * as volume from './volume';

/**
 * Properties for `DaemonSet`.
 */
export interface DaemonSetProps extends base.ResourceProps, pod.PodTemplateProps {

  /**
   * Minimum number of seconds for which a newly created pod should
   * be ready without any of its container crashing, for it to be considered available.
   *
   * @default 0
   */
  readonly minReadySeconds?: number;

  /**
   * Automatically allocates a pod selector for this daemon set.
   *
   * If this is set to `false` you must define your selector through
   * `dset.podMetadata.addLabel()` and `dset.selectByLabel()`.
   *
   * @default true
   */
  readonly defaultSelector?: boolean;

}

/**
 * A DaemonSet ensures that all (or some) Nodes run a copy of a Pod.
 * As nodes are added to the cluster, Pods are added to them.
 * As nodes are removed from the cluster, those Pods are garbage collected.
 * Deleting a DaemonSet will clean up the Pods it created.
 *
 * Some typical uses of a DaemonSet are:
 *
 * - running a cluster storage daemon on every node
 * - running a logs collection daemon on every node
 * - running a node monitoring daemon on every node
 *
 * In a simple case, one DaemonSet, covering all nodes, would be used for each type of daemon.
 * A more complex setup might use multiple DaemonSets for a single type of daemon,
 * but with different flags and/or different memory and cpu requests for different hardware types.
 */
export class DaemonSet extends base.Resource implements pod.IPodTemplate {

  private readonly _podTemplate: pod.PodTemplate;
  private readonly _labelSelector: Record<string, string>;

  /**
   * @see base.Resource.apiObject
   */
  protected readonly apiObject: ApiObject;

  public readonly minReadySeconds: number;

  constructor(scope: Construct, id: string, props: DaemonSetProps = {}) {
    super(scope, id);

    this.apiObject = new k8s.KubeDaemonSet(this, 'Resource', {
      metadata: props.metadata,
      spec: Lazy.any({ produce: () => this._toKube() }),
    });

    this.minReadySeconds = props.minReadySeconds ?? 0;

    this._podTemplate = new pod.PodTemplate(props);
    this._labelSelector = {};

    if (props.defaultSelector ?? true) {
      const selector = 'cdk8s.daemon-set';
      const matcher = Names.toLabelValue(this);
      this.podMetadata.addLabel(selector, matcher);
      this.selectByLabel(selector, matcher);
    }

  }

  /**
   * The labels this daemon set will match against in order to select pods.
   *
   * Returns a a copy. Use `selectByLabel()` to add labels.
   */
  public get labelSelector(): Record<string, string> {
    return { ...this._labelSelector };
  }

  public get podMetadata(): ApiObjectMetadataDefinition {
    return this._podTemplate.podMetadata;
  }

  public get containers(): container.Container[] {
    return this._podTemplate.containers;
  }

  public get initContainers(): container.Container[] {
    return this._podTemplate.initContainers;
  }

  public get hostAliases(): pod.HostAlias[] {
    return this._podTemplate.hostAliases;
  }

  public get volumes(): volume.Volume[] {
    return this._podTemplate.volumes;
  }

  public get restartPolicy(): pod.RestartPolicy | undefined {
    return this._podTemplate.restartPolicy;
  }

  public get serviceAccount(): serviceaccount.IServiceAccount | undefined {
    return this._podTemplate.serviceAccount;
  }

  public get securityContext(): pod.PodSecurityContext {
    return this._podTemplate.securityContext;
  }

  public addContainer(cont: container.ContainerProps): container.Container {
    return this._podTemplate.addContainer(cont);
  }

  public get dns(): pod.PodDns {
    return this._podTemplate.dns;
  }

  public addInitContainer(cont: container.ContainerProps): container.Container {
    return this._podTemplate.addInitContainer(cont);
  }

  public addHostAlias(hostAlias: pod.HostAlias): void {
    return this._podTemplate.addHostAlias(hostAlias);
  }

  public addVolume(vol: volume.Volume): void {
    return this._podTemplate.addVolume(vol);
  }

  /**
   * Configure a label selector to this daemon set.
   */
  public selectByLabel(key: string, value: string) {
    this._labelSelector[key] = value;
  }

  /**
   * @internal
   */
  public _toKube(): k8s.DaemonSetSpec {
    return {
      minReadySeconds: this.minReadySeconds,
      template: this._podTemplate._toPodTemplateSpec(),
      selector: {
        matchLabels: this._labelSelector,
      },
    };
  }

}